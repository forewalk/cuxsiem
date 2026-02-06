"""사용자 관련 Pydantic 스키마"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    """사용자 기본 필드"""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=50)
    role: str = Field(default="user")
    is_active: bool = True


class UserCreate(UserBase):
    """사용자 생성 요청"""
    username: str = Field(..., min_length=4, max_length=50, description="사용자 ID")
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """비밀번호 정책 검증: 영문+숫자 필수"""
        if not any(c.isalpha() for c in v):
            raise ValueError('비밀번호는 최소 1개의 영문을 포함해야 합니다')
        if not any(c.isdigit() for c in v):
            raise ValueError('비밀번호는 최소 1개의 숫자를 포함해야 합니다')
        return v


class UserUpdate(BaseModel):
    """사용자 수정 요청"""
    email: Optional[EmailStr] = None
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8, max_length=128)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not any(c.isalpha() for c in v):
            raise ValueError('비밀번호는 최소 1개의 영문을 포함해야 합니다')
        if not any(c.isdigit() for c in v):
            raise ValueError('비밀번호는 최소 1개의 숫자를 포함해야 합니다')
        return v


class UserResponse(UserBase):
    """사용자 응답"""
    id: str
    username: Optional[str] = None # 호환성을 위해 Optional
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    """사용자 목록 응답"""
    total: int
    users: List[UserResponse]
