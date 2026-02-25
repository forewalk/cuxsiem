"""인증 API 엔드포인트"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer

from app.schemas.auth import LoginRequest, LoginResponse, PasswordResetRequest, PasswordResetResponse
from app.schemas.user import UserApply, UserResponse, UserCreate
from app.services.auth import AuthService
from app.services.user import UserService
from app.core.security import decode_access_token

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


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
    """
    service = AuthService()
    ip_address = req.client.host if req.client else None
    return await service.login(request, ip_address)


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

    service = AuthService()
    # session_id는 실제로는 토큰에서 추출해야 함
    await service.logout(user_id, "")


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
