"""사용자 관리 Service"""
import uuid
from datetime import datetime

from fastapi import HTTPException, status

from app.core.security import get_password_hash
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import (
    UserCreate, UserUpdate, UserResponse, UserListResponse
)


class UserService:
    """사용자 관리 서비스"""

    def __init__(self):
        self.user_repo = UserRepository()

    async def create_user(self, request: UserCreate) -> UserResponse:
        """신규 사용자 생성"""
        # 이메일 중복 확인
        existing_user = await self.user_repo.get_by_email(request.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 사용 중인 이메일입니다"
            )

        now = datetime.utcnow()
        user = User(
            id=str(uuid.uuid4()),
            email=request.email.lower(),
            password_hash=get_password_hash(request.password),
            name=request.name,
            role=request.role,
            is_active=request.is_active,
            created_at=now,
            updated_at=now,
        )

        created_user = await self.user_repo.create(user)
        return UserResponse.model_validate(created_user)

    async def get_users(
        self, skip: int = 0, limit: int = 100
    ) -> UserListResponse:
        """사용자 목록 조회"""
        total, users = await self.user_repo.list(skip=skip, limit=limit)
        return UserListResponse(
            total=total,
            users=[UserResponse.model_validate(u) for u in users]
        )

    async def get_user(self, user_id: str) -> UserResponse:
        """사용자 상세 조회"""
        user = await self.user_repo.get_by_id(user_id)
        if not user or user.deleted_at:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다"
            )
        return UserResponse.model_validate(user)

    async def update_user(
        self, user_id: str, request: UserUpdate
    ) -> UserResponse:
        """사용자 정보 수정"""
        user = await self.user_repo.get_by_id(user_id)
        if not user or user.deleted_at:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다"
            )

        update_data = request.model_dump(exclude_unset=True)

        # 비밀번호 변경 시 해싱
        if "password" in update_data:
            update_data["password_hash"] = get_password_hash(
                update_data.pop("password")
            )

        # 이메일 변경 시 중복 확인
        if "email" in update_data and update_data["email"].lower() != user.email:
            existing_user = await self.user_repo.get_by_email(
                update_data["email"]
            )
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="이미 사용 중인 이메일입니다"
                )
            update_data["email"] = update_data["email"].lower()

        updated_user = await self.user_repo.update(user_id, update_data)
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="사용자 정보 수정에 실패했습니다"
            )

        return UserResponse.model_validate(updated_user)

    async def delete_user(self, user_id: str) -> None:
        """사용자 삭제"""
        user = await self.user_repo.get_by_id(user_id)
        if not user or user.deleted_at:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다"
            )

        success = await self.user_repo.delete(user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="사용자 삭제에 실패했습니다"
            )