"""의존성 주입 유틸리티"""
from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user
from app.services.user import UserService
from app.schemas.user import UserResponse


async def get_current_active_user(
    user_id: str = Depends(get_current_user)
) -> UserResponse:
    """현재 활성화된 사용자 조회"""
    service = UserService()
    user = await service.get_user(user_id)
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성 계정입니다"
        )
    return user


async def get_current_admin_user(
    current_user: UserResponse = Depends(get_current_active_user)
) -> UserResponse:
    """관리자 권한 확인"""
    if current_user.role != "role-1":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다"
        )
    return current_user
