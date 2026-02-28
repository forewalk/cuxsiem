"""사용자 관리 API 엔드포인트"""
from fastapi import APIRouter, Depends, status

from app.schemas.user import (
    UserCreate, UserUpdate, UserResponse, UserListResponse
)
from app.services.user import UserService
from app.api.v1.deps import get_current_admin_user

router = APIRouter(prefix="/users", tags=["users"])


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_user(
    request: UserCreate,
    current_admin: UserResponse = Depends(get_current_admin_user)
):
    """사용자 생성 (관리자 전용)"""
    service = UserService()
    return await service.create_user(request)


@router.get("/deleted", response_model=UserListResponse)
async def get_deleted_users(
    skip: int = 0,
    limit: int = 100,
    current_admin: UserResponse = Depends(get_current_admin_user)
):
    """삭제된 사용자 목록 조회 (관리자 전용)"""
    service = UserService()
    return await service.get_deleted_users(skip=skip, limit=limit)


@router.post("/{user_id}/restore", status_code=status.HTTP_200_OK)
async def restore_user(
    user_id: str,
    current_admin: UserResponse = Depends(get_current_admin_user)
):
    """삭제된 사용자 복구 (관리자 전용)"""
    service = UserService()
    await service.restore_user(user_id)
    return {"message": "사용자가 복구되었습니다"}


@router.delete("/{user_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
async def permanent_delete_user(
    user_id: str,
    current_admin: UserResponse = Depends(get_current_admin_user)
):
    """사용자 완전 삭제 (관리자 전용)"""
    service = UserService()
    await service.hard_delete_user(user_id)


@router.get("", response_model=UserListResponse)
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_admin: UserResponse = Depends(get_current_admin_user)
):
    """사용자 목록 조회 (관리자 전용)"""
    service = UserService()
    return await service.get_users(skip=skip, limit=limit)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_admin: UserResponse = Depends(get_current_admin_user)
):
    """사용자 상세 조회 (관리자 전용)"""
    service = UserService()
    return await service.get_user(user_id)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    request: UserUpdate,
    current_admin: UserResponse = Depends(get_current_admin_user)
):
    """사용자 정보 수정 (관리자 전용)"""
    service = UserService()
    return await service.update_user(user_id, request)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    current_admin: UserResponse = Depends(get_current_admin_user)
):
    """사용자 삭제 (관리자 전용)"""
    service = UserService()
    await service.delete_user(user_id)
