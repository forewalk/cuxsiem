"""로그인 관련 Pydantic 스키마"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=4)
    remember_me: bool = False
    force: bool = False


class UserResponse(BaseModel):
    """사용자 응답"""
    id: str
    username: Optional[str] = None
    email: str
    name: str
    role: str
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None
    otp_enabled: bool = False

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    """로그인 응답"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class TokenPayload(BaseModel):
    """JWT 토큰 페이로드"""
    sub: str  # user_id
    exp: int  # expiration timestamp
    iat: int  # issued at timestamp


class PasswordResetRequest(BaseModel):
    """비밀번호 초기화 요청"""
    username: str


class PasswordResetResponse(BaseModel):
    """비밀번호 초기화 응답"""
    password: str
