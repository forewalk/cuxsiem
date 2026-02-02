"""패스워드 정책 API 엔드포인트"""
from fastapi import APIRouter, Depends

from app.schemas.password_policy import PasswordPolicyUpdate, PasswordPolicyResponse
from app.schemas.user import UserResponse
from app.services.password_policy import PasswordPolicyService
from app.api.v1.deps import get_current_admin_user

router = APIRouter(prefix="/password-policy", tags=["password-policy"])


@router.get("", response_model=PasswordPolicyResponse)
async def get_password_policy(
    current_admin: UserResponse = Depends(get_current_admin_user)
):
    """패스워드 정책 조회 (관리자 전용)"""
    service = PasswordPolicyService()
    return await service.get_current_policy()


@router.put("", response_model=PasswordPolicyResponse)
async def update_password_policy(
    request: PasswordPolicyUpdate,
    current_admin: UserResponse = Depends(get_current_admin_user)
):
    """패스워드 정책 수정 (관리자 전용)"""
    service = PasswordPolicyService()
    return await service.update_policy(request)
