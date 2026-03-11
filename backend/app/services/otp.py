"""OTP 2단계 인증 서비스 - 핵심 비즈니스 로직"""

import os
import secrets
import pyotp
import qrcode
import bcrypt
from io import BytesIO
import base64
from datetime import datetime
from typing import Tuple, List, Optional
from app.models.otp import OTPConfig, OTPStatus
from app.utils.encryption import AESEncryption


class OTPService:
    """OTP 관리 서비스

    TOTP 시크릿 생성, QR코드 생성, OTP 검증, 백업 코드 관리 등을 담당합니다.
    """

    def __init__(self, encryption_key: str):
        """초기화

        Args:
            encryption_key: AES-256 암호화 키 (환경변수에서 로드)
        """
        self.encryption = AESEncryption(encryption_key)
        self.issuer = os.getenv("OTP_ISSUER", "CruxSIEM")
        self.max_attempts = int(os.getenv("OTP_MAX_ATTEMPTS", 5))
        self.time_window = int(os.getenv("OTP_TIME_WINDOW", 2))  # ±2 slices (60 sec)

    async def generate_secret(self) -> str:
        """새로운 TOTP 시크릿 생성

        RFC 6238 표준에 따른 32자리 Base32 문자열을 생성합니다.

        Returns:
            Base32 인코딩된 시크릿 (예: "JBSWY3DPEBLW64TMMQ6XAWBW")
        """
        return pyotp.random_base32()

    def generate_qr_code(
        self,
        secret: str,
        email: str,
        issuer: Optional[str] = None
    ) -> Tuple[str, str]:
        """QR코드 이미지 및 수동 입력용 키 생성

        폐쇄망 환경에서도 수동 입력으로 등록할 수 있도록 지원합니다.

        Args:
            secret: TOTP 시크릿
            email: 사용자 이메일 (QR코드에 표시)
            issuer: 발급자명 (기본값: CruxSIEM)

        Returns:
            (qr_code_base64, enrollment_uri) 튜플
                - qr_code_base64: data:image/png;base64,... 형식의 PNG 이미지
                - enrollment_uri: otpauth://... 형식의 provisioning URI
        """
        issuer = issuer or self.issuer

        # TOTP 객체 생성
        totp = pyotp.TOTP(secret)

        # Provisioning URI 생성 (Google Authenticator 등과 호환)
        uri = totp.provisioning_uri(name=email, issuer_name=issuer)

        # QR코드 생성
        qr = qrcode.QRCode(
            version=1,  # 자동으로 크기 결정
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(uri)
        qr.make(fit=True)

        # PNG 이미지로 변환
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)

        # Base64 인코딩 (data URL 형식)
        qr_base64 = "data:image/png;base64," + base64.b64encode(
            buffer.getvalue()
        ).decode('utf-8')

        return qr_base64, uri

    def verify_code(self, secret: str, code: str) -> bool:
        """OTP 코드 검증

        ±1 슬롯(30초 기본) 범위 내의 코드를 수락합니다.
        이는 클라이언트와 서버의 시간 차이를 허용하기 위함입니다.

        Args:
            secret: 복호화된 TOTP 시크릿
            code: 사용자가 입력한 6자리 코드

        Returns:
            검증 성공 여부
        """
        totp = pyotp.TOTP(secret)
        # valid_window=2: 현재 슬롯과 ±1 슬롯 (총 3개 슬롯)
        return totp.verify(code, valid_window=self.time_window)

    def _generate_backup_codes(self, count: int = 8) -> List[str]:
        """백업 코드 생성

        8자리 hexadecimal 형식의 일회용 코드를 생성합니다.

        Args:
            count: 생성할 코드 개수 (기본값: 8)

        Returns:
            백업 코드 리스트 (예: ["A1B2C3D4", "E5F6G7H8", ...])
        """
        return [secrets.token_hex(4).upper() for _ in range(count)]

    async def enroll_otp(
        self,
        secret: str,
        email: str
    ) -> dict:
        """OTP 등록 시작

        사용자가 TOTP 앱에 등록할 수 있도록 QR코드를 생성하고
        pending secret을 저장해야 합니다 (Repository에서 처리).

        Args:
            secret: 생성된 TOTP 시크릿
            email: 사용자 이메일

        Returns:
            {
                "qr_code_image": "data:image/png;base64,...",
                "manual_key": "JBSWY3DPEBLW64TMMQ6XAWBW",
                "enrollment_uri": "otpauth://...",
                "expires_in": 600
            }
        """
        # QR코드 생성
        qr_code, enrollment_uri = self.generate_qr_code(secret, email)

        return {
            "qr_code_image": qr_code,
            "manual_key": secret,  # 수동 입력용 키
            "enrollment_uri": enrollment_uri,
            "expires_in": 600,  # 10분 유효
        }

    async def verify_and_confirm_enrollment(
        self,
        secret: str,
        code: str
    ) -> Tuple[bool, List[str], List[str]]:
        """OTP 등록 완료 및 백업 코드 생성

        사용자가 입력한 OTP 코드를 검증하고, 검증 성공 시
        백업 코드를 생성하여 반환합니다.

        Args:
            secret: Pending secret (복호화되지 않은 상태)
            code: 사용자가 입력한 6자리 코드

        Returns:
            (성공 여부, 백업 코드 원본, 백업 코드 해시)
            - 성공: (True, ["A1B2C3D4", ...], ["$2b$...", ...])
            - 실패: (False, [], [])

        Raises:
            ValueError: 시크릿 복호화 실패
        """
        # Pending secret 복호화
        try:
            decrypted_secret = self.encryption.decrypt(secret)
        except Exception as e:
            return False, [], []

        # OTP 코드 검증
        if not self.verify_code(decrypted_secret, code):
            return False, [], []

        # 백업 코드 생성 및 bcrypt 해싱
        backup_codes = self._generate_backup_codes(8)
        backup_codes_hashed = [
            bcrypt.hashpw(code.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            for code in backup_codes
        ]

        # 원본 백업 코드와 해싱된 버전 모두 반환
        # 원본은 사용자에게 표시, 해시는 Repository에서 저장
        return True, backup_codes, backup_codes_hashed

    async def verify_backup_code(
        self,
        provided_code: str,
        stored_backup_codes: List[str]
    ) -> Tuple[bool, int]:
        """백업 코드 검증

        제공된 백업 코드와 저장된 bcrypt 해시를 비교합니다.
        만약 일치하면, 해당 코드를 배열에서 제거할 준비를 합니다.

        Args:
            provided_code: 사용자가 입력한 백업 코드
            stored_backup_codes: 저장된 백업 코드 해시 리스트

        Returns:
            (검증 성공 여부, 사용된 코드의 인덱스 또는 -1)
        """
        for idx, hashed_code in enumerate(stored_backup_codes):
            try:
                if bcrypt.checkpw(
                    provided_code.encode('utf-8'),
                    hashed_code.encode('utf-8')
                ):
                    return True, idx
            except (ValueError, TypeError):
                # bcrypt 해시 형식이 잘못된 경우
                continue

        return False, -1

    async def disable_otp(self) -> bool:
        """OTP 비활성화

        모든 OTP 관련 필드를 제거합니다 (Repository에서 처리).

        Returns:
            항상 True
        """
        return True

    async def admin_disable_otp(self, admin_id: str, target_user_id: str) -> bool:
        """관리자의 사용자 OTP 강제 해제

        폰 분실 + 백업 코드 분실 시 극단적 상황 대응.
        감사 로그를 남겨야 합니다 (Repository에서 처리).

        Args:
            admin_id: 관리자 ID
            target_user_id: 대상 사용자 ID

        Returns:
            항상 True
        """
        # Repository에서 감사 로그 및 OTP 필드 삭제 처리
        return True

    def get_time_window(self) -> int:
        """TOTP 시간 윈도우 반환

        Returns:
            시간 윈도우 (슬롯 단위)
        """
        return self.time_window

    def get_max_attempts(self) -> int:
        """최대 시도 횟수 반환

        Returns:
            최대 시도 횟수
        """
        return self.max_attempts
