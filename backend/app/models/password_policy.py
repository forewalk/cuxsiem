"""패스워드 정책 모델"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class PasswordPolicy:
    """패스워드 정책 데이터 클래스"""
    id: str
    min_length: int
    require_uppercase: bool
    require_lowercase: bool
    require_numbers: bool
    require_special_chars: bool
    max_password_age_days: int
    password_history_count: int
    lockout_threshold: int
    lockout_duration_minutes: int
    created_at: datetime
    updated_at: datetime

    def to_dict(self) -> dict:
        """OpenSearch 문서로 변환"""
        return {
            "min_length": self.min_length,
            "require_uppercase": self.require_uppercase,
            "require_lowercase": self.require_lowercase,
            "require_numbers": self.require_numbers,
            "require_special_chars": self.require_special_chars,
            "max_password_age_days": self.max_password_age_days,
            "password_history_count": self.password_history_count,
            "lockout_threshold": self.lockout_threshold,
            "lockout_duration_minutes": self.lockout_duration_minutes,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
