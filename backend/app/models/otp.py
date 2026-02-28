"""OTP 2단계 인증 관련 데이터 모델"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List


@dataclass
class OTPConfig:
    """사용자 OTP 설정 정보

    OpenSearch의 cs_users 인덱스에서 다음 필드로 매핑됩니다:
    - otp_enabled: boolean
    - otp_secret_enc: keyword (AES-256 암호화)
    - otp_pending_secret_enc: keyword (등록 중 미확정)
    - otp_backup_codes: keyword[] (bcrypt 해싱됨)
    - otp_enrolled_at: date
    """

    enabled: bool = False
    secret_enc: Optional[str] = None  # AES-256 암호화된 TOTP 시크릿
    pending_secret_enc: Optional[str] = None  # 등록 진행 중인 시크릿
    backup_codes: List[str] = field(default_factory=list)  # bcrypt 해싱된 백업 코드
    enrolled_at: Optional[datetime] = None  # OTP 등록 완료 시각

    def to_dict(self) -> dict:
        """OpenSearch 문서 형식으로 변환

        Returns:
            OpenSearch 업데이트용 딕셔너리
        """
        return {
            "otp_enabled": self.enabled,
            "otp_secret_enc": self.secret_enc,
            "otp_pending_secret_enc": self.pending_secret_enc,
            "otp_backup_codes": self.backup_codes,
            "otp_enrolled_at": self.enrolled_at.isoformat() if self.enrolled_at else None,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "OTPConfig":
        """OpenSearch 문서에서 생성

        Args:
            data: OpenSearch 문서

        Returns:
            OTPConfig 인스턴스
        """
        enrolled_at = None
        if data.get("otp_enrolled_at"):
            try:
                enrolled_at = datetime.fromisoformat(
                    data["otp_enrolled_at"].replace("Z", "+00:00")
                )
            except (ValueError, AttributeError):
                enrolled_at = None

        return cls(
            enabled=data.get("otp_enabled", False),
            secret_enc=data.get("otp_secret_enc"),
            pending_secret_enc=data.get("otp_pending_secret_enc"),
            backup_codes=data.get("otp_backup_codes", []),
            enrolled_at=enrolled_at,
        )

    def is_enrolled(self) -> bool:
        """OTP가 등록되어 있는지 확인

        Returns:
            OTP 활성화 여부
        """
        return self.enabled and bool(self.secret_enc)

    def has_backup_codes(self) -> int:
        """남은 백업 코드 개수 반환

        Returns:
            백업 코드 개수
        """
        return len(self.backup_codes)


@dataclass
class OTPStatus:
    """사용자 OTP 상태 조회용 응답 모델"""

    enabled: bool
    is_pending: bool = False  # 등록 진행 중
    enrolled_at: Optional[str] = None
    backup_codes_count: int = 0

    @classmethod
    def from_config(cls, config: OTPConfig) -> "OTPStatus":
        """OTPConfig에서 생성

        Args:
            config: OTPConfig 인스턴스

        Returns:
            OTPStatus 인스턴스
        """
        return cls(
            enabled=config.enabled,
            is_pending=bool(config.pending_secret_enc),
            enrolled_at=config.enrolled_at.isoformat() if config.enrolled_at else None,
            backup_codes_count=len(config.backup_codes),
        )


@dataclass
class BackupCodeValidator:
    """백업 코드 검증 결과"""

    valid: bool
    message: str = ""
    remaining_codes: int = 0

    @staticmethod
    def from_success(remaining: int) -> "BackupCodeValidator":
        """검증 성공 결과 생성"""
        return BackupCodeValidator(
            valid=True,
            message="Backup code verified successfully",
            remaining_codes=remaining,
        )

    @staticmethod
    def from_failure(reason: str) -> "BackupCodeValidator":
        """검증 실패 결과 생성"""
        return BackupCodeValidator(
            valid=False,
            message=reason,
            remaining_codes=0,
        )
