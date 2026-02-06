"""인증 API 엔드포인트"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer

from app.schemas.auth import LoginRequest, LoginResponse, PasswordResetRequest, PasswordResetResponse
from app.services.auth import AuthService
from app.core.security import decode_access_token

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


@router.post("/reset-password", response_model=PasswordResetResponse)
async def reset_password(request: PasswordResetRequest):
    """
    비밀번호 초기화 (임시 비밀번호 발급)
    
    사용자 ID를 입력받아 비밀번호를 초기화하고 임시 비밀번호를 반환합니다.
    (관리자용 기능이 아니며, 본인 인증이 어려운 폐쇄망 환경에서 제한적으로 사용)
    """
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
