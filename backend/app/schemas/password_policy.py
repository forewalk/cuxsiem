"""패스워드 정책 Pydantic 스키마"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class PasswordPolicyBase(BaseModel):
    """패스워드 정책 기본 필드"""
    min_length: int = Field(default=8, ge=4, le=64)
    require_uppercase: bool = Field(default=False)
    require_lowercase: bool = Field(default=True)
    require_numbers: bool = Field(default=True)
    require_special_chars: bool = Field(default=False)
    max_password_age_days: int = Field(default=90, ge=0, le=365)
    password_history_count: int = Field(default=3, ge=0, le=12)
    lockout_threshold: int = Field(default=5, ge=0, le=20)
    lockout_duration_minutes: int = Field(default=30, ge=1, le=1440)


class PasswordPolicyUpdate(PasswordPolicyBase):
    """패스워드 정책 수정 요청"""
    pass


class PasswordPolicyResponse(PasswordPolicyBase):
    """패스워드 정책 응답"""
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
