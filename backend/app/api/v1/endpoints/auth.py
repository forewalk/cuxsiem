"""인증 API 엔드포인트"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
import os

from app.schemas.auth import LoginRequest, LoginResponse, PasswordResetRequest, PasswordResetResponse
from app.schemas.otp import (
    OTPEnrollResponse, OTPVerifyEnrollRequest, OTPVerifyEnrollResponse,
    OTPLoginRequest, OTPLoginResponse, BackupCodeLoginRequest, OTPDisableRequest,
    OTPStatusResponse
)
from app.schemas.user import UserApply, UserResponse, UserCreate
from app.services.auth import AuthService
from app.services.user import UserService
from app.services.otp import OTPService
from app.core.security import decode_access_token
from app.repositories.user import UserRepository

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


@router.get("/check-id")
async def check_id(username: str):
    """
    ID 사용 가능 여부 체크

    삭제된 사용자 포함하여 체크합니다.
    """
    from app.repositories.user import UserRepository
    user_repo = UserRepository()
    user = await user_repo.get_by_id(username)
    available = user is None
    return {"available": available}


@router.post("/apply", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def apply_account(request: UserApply):
    """
    계정 신청
    
    사용자로부터 정보를 입력받아 비활성 계정을 생성합니다.
    역할은 'user', 상태는 'inactive'로 강제 설정됩니다.
    """
    user_service = UserService()
    # UserApply를 UserCreate로 변환하면서 role과 is_active를 강제로 설정
    create_request = UserCreate(
        username=request.username,
        email=request.email,
        name=request.name,
        password=request.password,
        role="user",
        is_active=False
    )
    return await user_service.create_user(create_request)


@router.post("/reset-password", response_model=PasswordResetResponse)
async def reset_password(request: PasswordResetRequest):
    """
    비밀번호 초기화 (임시 비밀번호 발급)
    
    사용자 ID를 입력받아 비밀번호를 초기화하고 임시 비밀번호를 반환합니다.
    (관리자용 기능이 아니며, 본인 인증이 어려운 폐쇄망 환경에서 제한적으로 사용)
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Received reset-password request for: {request.username}")
    
    service = AuthService()
    temp_password = await service.reset_password(request.username)
    return PasswordResetResponse(password=temp_password)


@router.post("/login", response_model=LoginResponse, status_code=200)
async def login(request: LoginRequest, req: Request):
    """
    로그인

    - **username**: 사용자 ID
    - **password**: 비밀번호 (최소 8자, 영문+숫자 필수)
    - **remember_me**: 로그인 유지 (기본: false)
    - **force**: 기존 세션 강제 종료 (기본: false)
    """
    service = AuthService()
    # 프록시 환경(nginx/도커)에서 실제 클라이언트 IP 추출
    x_forwarded_for = req.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        ip_address = x_forwarded_for.split(",")[0].strip()
    else:
        ip_address = req.headers.get("X-Real-IP") or (req.client.host if req.client else None)
    return await service.login(request, ip_address, force=request.force)


@router.post("/logout", status_code=204)
async def logout(credentials=Depends(security)):
    """로그아웃"""
    token = credentials.credentials
    user_id = decode_access_token(token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 유효하지 않습니다"
        )

    from app.core.security import get_token_hash
    from app.repositories.session import SessionRepository
    token_hash = get_token_hash(token)
    session_repo = SessionRepository()
    session = await session_repo.get_by_token_hash(token_hash)

    service = AuthService()
    session_id = session.id if session else ""
    await service.logout(user_id, session_id)


@router.get("/me")
async def get_current_user(credentials=Depends(security)):
    """현재 사용자 정보 조회"""
    token = credentials.credentials
    user_id = decode_access_token(token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 유효하지 않습니다"
        )

    service = AuthService()
    return await service.get_user(user_id)


# ============================================================================
# OTP 2단계 인증 엔드포인트
# ============================================================================

@router.post("/otp/enroll", response_model=OTPEnrollResponse)
async def enroll_otp(credentials=Depends(security)):
    """
    OTP 등록 시작 (QR코드 발급)

    - QR코드 이미지 반환 (data:image/png;base64,...)
    - manual_key 제공 (폐쇄망 환경용 수동 입력)
    - enrollment_uri 제공 (OTP 앱용)
    """
    token = credentials.credentials
    user_id = decode_access_token(token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 유효하지 않습니다"
        )

    # 사용자 조회
    user_repo = UserRepository()
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )

    # 이미 OTP 활성화된 사용자
    otp_status = await user_repo.get_user_otp_status(user_id)
    if otp_status and otp_status["enabled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 OTP가 활성화되어 있습니다"
        )

    # OTP 시크릿 생성
    encryption_key = os.getenv("OTP_ENCRYPTION_KEY")
    if not encryption_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OTP 서버 설정 오류"
        )

    otp_service = OTPService(encryption_key)
    secret = await otp_service.generate_secret()

    # Pending secret 저장
    from app.utils.encryption import AESEncryption
    encryption = AESEncryption(encryption_key)
    encrypted_secret = encryption.encrypt(secret)
    await user_repo.update_otp_field(user_id, "otp_pending_secret_enc", encrypted_secret)

    # QR코드 생성
    result = await otp_service.enroll_otp(secret, user.email)

    return OTPEnrollResponse(**result)


@router.post("/otp/verify-enroll", response_model=OTPVerifyEnrollResponse)
async def verify_enroll(request: OTPVerifyEnrollRequest, credentials=Depends(security)):
    """
    OTP 활성화 확인

    - OTP 코드(6자리) 검증
    - 백업 코드(8개) 생성 및 반환
    """
    token = credentials.credentials
    user_id = decode_access_token(token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 유효하지 않습니다"
        )

    user_repo = UserRepository()
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )

    # Pending secret 조회
    otp_status = await user_repo.get_user_otp_status(user_id)
    if not otp_status or not otp_status["is_pending"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="등록 진행 중인 OTP가 없습니다"
        )

    # OTP 검증 및 백업 코드 생성
    user_doc = await user_repo.get_by_id(user_id)
    pending_secret = user_doc.get("otp_pending_secret_enc") if isinstance(user_doc, dict) else None

    if not pending_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="pending secret을 찾을 수 없습니다"
        )

    encryption_key = os.getenv("OTP_ENCRYPTION_KEY")
    otp_service = OTPService(encryption_key)

    # 암호화된 pending secret은 이미 저장되어 있음
    success, backup_codes, backup_hashes = \
        await otp_service.verify_and_confirm_enrollment(pending_secret, request.code)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP 코드가 유효하지 않습니다"
        )

    # OTP 활성화: secret_enc 저장, backup_codes 저장
    from app.models.otp import OTPConfig
    from datetime import datetime

    config = OTPConfig(
        enabled=True,
        secret_enc=pending_secret,
        backup_codes=backup_hashes,
        enrolled_at=datetime.utcnow()
    )

    await user_repo.update_otp_config(user_id, config.to_dict())

    return OTPVerifyEnrollResponse(
        backup_codes=backup_codes,
        enrolled_at=config.enrolled_at
    )


@router.post("/otp/login", response_model=OTPLoginResponse)
async def login_otp(request: OTPLoginRequest, credentials=Depends(security)):
    """
    OTP 코드 검증 (로그인 2단계)

    - 임시 토큰(otp_verified: false)으로 요청
    - OTP 코드 검증 후 정식 토큰(otp_verified: true) 반환
    """
    token = credentials.credentials
    user_id = decode_access_token(token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 유효하지 않습니다"
        )

    # OTP 상태 확인
    user_repo = UserRepository()
    otp_status = await user_repo.get_user_otp_status(user_id)

    if not otp_status or not otp_status["enabled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP가 활성화되지 않았습니다"
        )

    # 사용자의 OTP 시크릿 조회
    user_doc = await user_repo.get_by_id(user_id)
    secret_enc = user_doc.get("otp_secret_enc") if isinstance(user_doc, dict) else None

    if not secret_enc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OTP 시크릿을 찾을 수 없습니다"
        )

    # OTP 검증
    encryption_key = os.getenv("OTP_ENCRYPTION_KEY")
    otp_service = OTPService(encryption_key)
    from app.utils.encryption import AESEncryption
    encryption = AESEncryption(encryption_key)

    try:
        decrypted_secret = encryption.decrypt(secret_enc)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OTP 시크릿 복호화 실패"
        )

    if not otp_service.verify_code(decrypted_secret, request.code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="OTP 코드가 유효하지 않습니다"
        )

    # TODO: 정식 토큰 생성 (otp_verified: true)
    # 현재는 임시 구현으로 200 응답
    return OTPLoginResponse(
        access_token=token,  # 실제로는 새로운 토큰 발급
        token_type="bearer",
        expires_in=3600
    )


@router.post("/otp/login/backup", response_model=OTPLoginResponse)
async def login_backup_code(request: BackupCodeLoginRequest, credentials=Depends(security)):
    """
    백업 코드 검증 (로그인 2단계 대체)

    - OTP 앱 분실 시 백업 코드로 로그인
    """
    token = credentials.credentials
    user_id = decode_access_token(token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 유효하지 않습니다"
        )

    user_repo = UserRepository()
    user_doc = await user_repo.get_by_id(user_id)
    backup_codes = user_doc.get("otp_backup_codes", []) if isinstance(user_doc, dict) else []

    if not backup_codes:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="백업 코드가 없습니다"
        )

    # 백업 코드 검증
    encryption_key = os.getenv("OTP_ENCRYPTION_KEY")
    otp_service = OTPService(encryption_key)

    valid, idx = await otp_service.verify_backup_code(request.backup_code, backup_codes)

    if not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="백업 코드가 유효하지 않습니다"
        )

    # 사용된 백업 코드 제거
    if idx >= 0:
        backup_codes.pop(idx)
        await user_repo.update_otp_field(user_id, "otp_backup_codes", backup_codes)

    # TODO: 정식 토큰 생성
    return OTPLoginResponse(
        access_token=token,  # 실제로는 새로운 토큰 발급
        token_type="bearer",
        expires_in=3600
    )


@router.delete("/otp", status_code=200)
async def disable_otp(request: OTPDisableRequest, credentials=Depends(security)):
    """
    OTP 비활성화 (사용자 자가 해제)

    - OTP 코드 또는 백업 코드로 검증 후 비활성화
    """
    token = credentials.credentials
    user_id = decode_access_token(token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 유효하지 않습니다"
        )

    if not request.has_verification():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP 코드 또는 백업 코드가 필요합니다"
        )

    user_repo = UserRepository()
    user_doc = await user_repo.get_by_id(user_id)
    secret_enc = user_doc.get("otp_secret_enc") if isinstance(user_doc, dict) else None

    encryption_key = os.getenv("OTP_ENCRYPTION_KEY")
    otp_service = OTPService(encryption_key)
    from app.utils.encryption import AESEncryption
    encryption = AESEncryption(encryption_key)

    # 코드 또는 백업 코드로 검증
    valid = False

    if request.code:
        if secret_enc:
            try:
                decrypted_secret = encryption.decrypt(secret_enc)
                valid = otp_service.verify_code(decrypted_secret, request.code)
            except Exception:
                pass
    elif request.backup_code:
        backup_codes = user_doc.get("otp_backup_codes", []) if isinstance(user_doc, dict) else []
        valid, _ = await otp_service.verify_backup_code(request.backup_code, backup_codes)

    if not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="검증 실패"
        )

    # OTP 비활성화
    await user_repo.clear_otp_fields(user_id)

    return {"message": "OTP가 비활성화되었습니다"}


@router.delete("/admin/users/{user_id}/otp", status_code=200)
async def admin_disable_otp(user_id: str, credentials=Depends(security)):
    """
    관리자 사용자 OTP 강제 해제

    - Admin만 가능
    - 폰 분실 + 백업 코드 분실 시 극단적 상황 대응
    """
    token = credentials.credentials
    admin_id = decode_access_token(token)

    if not admin_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 유효하지 않습니다"
        )

    # 관리자 권한 확인
    user_repo = UserRepository()
    admin_user = await user_repo.get_by_id(admin_id)
    if not admin_user or admin_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin 권한이 필요합니다"
        )

    # 대상 사용자 확인
    target_user = await user_repo.get_by_id(user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )

    # OTP 강제 해제
    await user_repo.clear_otp_fields(user_id)

    # TODO: 감사 로그 기록
    # audit_log = AuditLog(
    #     admin_id=admin_id,
    #     target_user_id=user_id,
    #     action="ADMIN_DISABLE_OTP",
    #     timestamp=datetime.utcnow()
    # )

    return {
        "message": "사용자의 OTP가 강제 해제되었습니다",
        "user_id": user_id
    }
