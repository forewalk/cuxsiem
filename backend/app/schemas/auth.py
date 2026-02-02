"""로그인 관련 Pydantic 스키마"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime


class LoginRequest(BaseModel):
    """로그인 요청"""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    remember_me: bool = False

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """비밀번호 정책 검증: 영문+숫자 필수"""
        if not any(c.isalpha() for c in v):
            raise ValueError('비밀번호는 최소 1개의 영문을 포함해야 합니다')
        if not any(c.isdigit() for c in v):
            raise ValueError('비밀번호는 최소 1개의 숫자를 포함해야 합니다')
        return v


class UserResponse(BaseModel):
    """사용자 응답"""
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None

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
