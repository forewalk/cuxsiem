"""사용자 모델"""
from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class User:
    """사용자 데이터 클래스"""
    id: str
    email: str
    password_hash: str
    name: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    otp_pending_secret_enc: Optional[str] = None
    otp_secret_enc: Optional[str] = None
    otp_enabled: bool = False
    otp_backup_codes: Optional[list] = None
    otp_enrolled_at: Optional[datetime] = None

    def to_dict(self) -> dict:
        """OpenSearch 문서로 변환"""
        return {
            "id": self.id,
            "email": self.email,
            "password_hash": self.password_hash,
            "name": self.name,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "deleted_at": self.deleted_at.isoformat() if self.deleted_at else None,
            "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
        }


@dataclass
class Session:
    """세션 데이터 클래스"""
    id: str
    user_id: str
    token_hash: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    last_active_at: Optional[datetime] = None
    is_active: bool = True

    def to_dict(self) -> dict:
        """OpenSearch 문서로 변환"""
        return {
            "user_id": self.user_id,
            "token_hash": self.token_hash,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "last_active_at": self.last_active_at.isoformat() if self.last_active_at else None,
            "is_active": self.is_active,
        }


@dataclass
class LoginAttempt:
    """로그인 시도 기록"""
    id: str
    account: str
    success: bool
    attempted_at: datetime
    ip_address: Optional[str] = None
    error_message: Optional[str] = None

    def to_dict(self) -> dict:
        """OpenSearch 문서로 변환"""
        return {
            "account": self.account,
            "success": self.success,
            "attempted_at": self.attempted_at.isoformat(),
            "ip_address": self.ip_address,
            "error_message": self.error_message,
        }
