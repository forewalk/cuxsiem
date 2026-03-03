"""사용자 관련 Pydantic 스키마"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    """사용자 기본 필드"""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=50)
    role: str = Field(default="role-4")
    is_active: bool = True


class UserCreate(UserBase):
    """사용자 생성 요청"""
    username: str = Field(..., min_length=4, max_length=50, description="사용자 ID")
    password: str = Field(..., min_length=4, max_length=128)


class UserApply(BaseModel):
    """계정 신청 요청"""
    username: str = Field(..., min_length=4, max_length=50, description="사용자 ID")
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=4, max_length=128)


class UserUpdate(BaseModel):
    """사용자 수정 요청"""
    email: Optional[EmailStr] = None
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=4, max_length=128)


class UserResponse(UserBase):
    """사용자 응답"""
    id: str
    username: Optional[str] = None # 호환성을 위해 Optional
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None
    otp_enabled: bool = False

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    """사용자 목록 응답"""
    total: int
    users: List[UserResponse]
