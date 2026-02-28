"""OTP 2단계 인증 API 요청/응답 스키마"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime


class OTPEnrollResponse(BaseModel):
    """OTP 등록 시작 응답

    사용자에게 QR코드와 수동 입력용 키를 제공합니다.
    폐쇄망 환경에서는 manual_key를 사용하여 수동 입력 가능합니다.
    """

    qr_code_image: str = Field(
        ...,
        description="QR코드 이미지 (Base64 인코딩된 PNG)",
        example="data:image/png;base64,iVBORw0KGgo..."
    )
    manual_key: str = Field(
        ...,
        description="수동 입력용 시크릿 키 (Base32 형식)",
        example="JBSWY3DPEBLW64TMMQ6XAWBW"
    )
    enrollment_uri: str = Field(
        ...,
        description="OTP 앱용 provisioning URI",
        example="otpauth://totp/cruxSIEM:user@example.com?secret=..."
    )
    expires_in: int = Field(
        default=600,
        description="QR코드 유효 기간 (초단위)",
        example=600
    )

    class Config:
        json_schema_extra = {
            "example": {
                "qr_code_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
                "manual_key": "JBSWY3DPEBLW64TMMQ6XAWBW",
                "enrollment_uri": "otpauth://totp/cruxSIEM:user@example.com?secret=...",
                "expires_in": 600
            }
        }


class OTPVerifyEnrollRequest(BaseModel):
    """OTP 활성화 확인 요청

    사용자가 OTP 앱에서 생성된 6자리 코드를 입력합니다.
    """

    code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        description="OTP 앱에서 생성된 6자리 코드",
        example="123456"
    )

    @field_validator('code')
    @classmethod
    def code_must_be_numeric(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("코드는 숫자만 포함해야 합니다")
        return v


class OTPVerifyEnrollResponse(BaseModel):
    """OTP 활성화 확인 응답

    등록이 완료되고 백업 코드를 반환합니다.
    """

    backup_codes: List[str] = Field(
        ...,
        description="8개의 백업 코드 (일회용)",
        example=["A1B2C3D4", "E5F6G7H8", "I9J0K1L2", "M3N4O5P6", "Q7R8S9T0", "U1V2W3X4", "Y5Z6A7B8", "C9D0E1F2"]
    )
    enrolled_at: datetime = Field(
        ...,
        description="OTP 등록 완료 시각",
        example="2026-03-01T10:30:45Z"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "backup_codes": ["A1B2C3D4", "E5F6G7H8", "I9J0K1L2", "M3N4O5P6", "Q7R8S9T0", "U1V2W3X4", "Y5Z6A7B8", "C9D0E1F2"],
                "enrolled_at": "2026-03-01T10:30:45Z"
            }
        }


class OTPLoginRequest(BaseModel):
    """OTP 로그인 요청 (2단계 인증)

    임시 토큰을 가진 사용자가 OTP 코드를 입력합니다.
    """

    code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        description="OTP 앱에서 생성된 6자리 코드",
        example="123456"
    )

    @field_validator('code')
    @classmethod
    def code_must_be_numeric(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("코드는 숫자만 포함해야 합니다")
        return v


class OTPLoginResponse(BaseModel):
    """OTP 로그인 성공 응답

    otp_verified: true 클레임을 가진 정식 토큰을 반환합니다.
    """

    access_token: str = Field(
        ...,
        description="JWT 액세스 토큰 (otp_verified: true)",
        example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    )
    token_type: str = Field(
        default="bearer",
        description="토큰 타입",
        example="bearer"
    )
    expires_in: int = Field(
        ...,
        description="토큰 유효 기간 (초단위)",
        example=3600
    )

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 3600
            }
        }


class BackupCodeLoginRequest(BaseModel):
    """백업 코드 로그인 요청

    OTP 앱을 분실한 경우 백업 코드를 사용합니다.
    """

    backup_code: str = Field(
        ...,
        min_length=8,
        max_length=8,
        description="백업 코드 (8자리 hexadecimal)",
        example="A1B2C3D4"
    )

    @field_validator('backup_code')
    @classmethod
    def code_must_be_hex(cls, v: str) -> str:
        try:
            int(v, 16)
        except ValueError:
            raise ValueError("백업 코드는 hexadecimal 형식이어야 합니다")
        return v.upper()


class OTPDisableRequest(BaseModel):
    """OTP 비활성화 요청

    사용자가 OTP를 해제할 때 코드나 백업 코드로 검증합니다.
    둘 다 제공하면 code가 우선됩니다.
    """

    code: Optional[str] = Field(
        default=None,
        min_length=6,
        max_length=6,
        description="OTP 코드 (6자리)",
        example="123456"
    )
    backup_code: Optional[str] = Field(
        default=None,
        min_length=8,
        max_length=8,
        description="백업 코드 (8자리)",
        example="A1B2C3D4"
    )

    @field_validator('code', mode='before')
    @classmethod
    def validate_code(cls, v: Optional[str]) -> Optional[str]:
        if v and not v.isdigit():
            raise ValueError("코드는 숫자만 포함해야 합니다")
        return v

    @field_validator('backup_code', mode='before')
    @classmethod
    def validate_backup_code(cls, v: Optional[str]) -> Optional[str]:
        if v:
            try:
                int(v, 16)
            except ValueError:
                raise ValueError("백업 코드는 hexadecimal 형식이어야 합니다")
            return v.upper()
        return v

    def has_verification(self) -> bool:
        """코드나 백업 코드 중 하나라도 제공되었는지 확인"""
        return bool(self.code) or bool(self.backup_code)


class OTPStatusResponse(BaseModel):
    """OTP 상태 조회 응답"""

    enabled: bool = Field(
        ...,
        description="OTP 활성화 여부",
        example=True
    )
    enrolled_at: Optional[str] = Field(
        default=None,
        description="OTP 등록 완료 시각",
        example="2026-03-01T10:30:45Z"
    )
    backup_codes_count: int = Field(
        default=0,
        description="남은 백업 코드 개수",
        example=8
    )
    is_pending: bool = Field(
        default=False,
        description="등록 진행 중 여부",
        example=False
    )

    class Config:
        json_schema_extra = {
            "example": {
                "enabled": True,
                "enrolled_at": "2026-03-01T10:30:45Z",
                "backup_codes_count": 8,
                "is_pending": False
            }
        }


class ErrorResponse(BaseModel):
    """에러 응답"""

    detail: str = Field(
        ...,
        description="에러 메시지",
        example="Invalid OTP code"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "detail": "Invalid OTP code"
            }
        }
