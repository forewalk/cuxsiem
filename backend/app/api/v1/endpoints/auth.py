"""인증 API 엔드포인트"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer

from app.schemas.auth import LoginRequest, LoginResponse
from app.services.auth import AuthService
from app.core.security import decode_access_token

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


@router.post("/login", response_model=LoginResponse, status_code=200)
async def login(request: LoginRequest, req: Request):
    """
    로그인

    - **email**: 이메일 주소
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
