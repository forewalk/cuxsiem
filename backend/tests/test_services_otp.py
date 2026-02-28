"""OTP 서비스 계층 테스트"""

import pytest
import pyotp
import bcrypt
import asyncio
from app.services.otp import OTPService
from app.utils.encryption import AESEncryption


@pytest.fixture
def encryption_key():
    """테스트용 32바이트 암호화 키"""
    return "a" * 32


@pytest.fixture
def otp_service(encryption_key):
    """OTP 서비스 인스턴스"""
    return OTPService(encryption_key)


@pytest.fixture
def encryption(encryption_key):
    """암호화 인스턴스"""
    return AESEncryption(encryption_key)


class TestOTPServiceGeneration:
    """OTP 생성 관련 테스트"""

    @pytest.mark.asyncio
    async def test_generate_secret_returns_base32_string(self, otp_service):
        """새로운 시크릿 생성 - Base32 형식 검증"""
        secret = await otp_service.generate_secret()

        # Base32 문자만 포함 (A-Z, 2-7)
        assert isinstance(secret, str)
        assert len(secret) == 32
        assert all(c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567=" for c in secret)

    @pytest.mark.asyncio
    async def test_generate_secret_creates_different_secrets(self, otp_service):
        """시크릿 생성 - 매번 다른 값"""
        secret1 = await otp_service.generate_secret()
        secret2 = await otp_service.generate_secret()

        assert secret1 != secret2

    def test_generate_qr_code_returns_png_image(self, otp_service):
        """QR코드 생성 - PNG 이미지 반환"""
        secret = "JBSWY3DPEBLW64TMMQ6XAWBW"
        email = "user@example.com"

        qr_code, uri = otp_service.generate_qr_code(secret, email)

        # QR코드는 data URL 형식
        assert qr_code.startswith("data:image/png;base64,")
        assert len(qr_code) > 100

        # URI는 otpauth 형식
        assert uri.startswith("otpauth://totp/")
        # @ 기호는 URL 인코딩되어 %40으로 표시
        assert ("user@example.com" in uri or "user%40example.com" in uri)
        assert "cruxSIEM" in uri

    def test_generate_qr_code_with_custom_issuer(self, otp_service):
        """QR코드 생성 - 커스텀 발급자명"""
        secret = "JBSWY3DPEBLW64TMMQ6XAWBW"
        email = "user@example.com"
        custom_issuer = "MyCompany"

        _, uri = otp_service.generate_qr_code(secret, email, issuer=custom_issuer)

        assert custom_issuer in uri
        assert "cruxSIEM" not in uri

    def test_verify_code_accepts_valid_code(self, otp_service):
        """OTP 코드 검증 - 유효한 코드"""
        secret = "JBSWY3DPEBLW64TMMQ6XAWBW"
        totp = pyotp.TOTP(secret)

        # 현재 코드 생성
        code = totp.now()
        assert otp_service.verify_code(secret, code) is True

    def test_verify_code_rejects_invalid_code(self, otp_service):
        """OTP 코드 검증 - 유효하지 않은 코드"""
        secret = "JBSWY3DPEBLW64TMMQ6XAWBW"

        assert otp_service.verify_code(secret, "000000") is False
        assert otp_service.verify_code(secret, "999999") is False

    def test_verify_code_with_time_window(self, otp_service):
        """OTP 코드 검증 - 타임 윈도우 허용"""
        secret = "JBSWY3DPEBLW64TMMQ6XAWBW"
        totp = pyotp.TOTP(secret)

        # 현재 코드는 당연히 통과
        current_code = totp.now()
        assert otp_service.verify_code(secret, current_code) is True

        # 이전/다음 슬롯은 time_window 설정에 따라 허용/거부
        # (실제 검증은 pyotp에 위임)


class TestOTPServiceEnrollment:
    """OTP 등록 관련 테스트"""

    @pytest.mark.asyncio
    async def test_enroll_otp_returns_qr_and_manual_key(self, otp_service):
        """OTP 등록 시작 - QR코드 및 수동 키"""
        secret = "JBSWY3DPEBLW64TMMQ6XAWBW"
        email = "user@example.com"

        result = await otp_service.enroll_otp(secret, email)

        assert "qr_code_image" in result
        assert result["qr_code_image"].startswith("data:image/png;base64,")
        assert "manual_key" in result
        assert result["manual_key"] == secret  # 수동 입력용 키는 평문
        assert "enrollment_uri" in result
        assert "expires_in" in result
        assert result["expires_in"] == 600

    @pytest.mark.asyncio
    async def test_verify_and_confirm_enrollment_success(
        self, otp_service, encryption
    ):
        """OTP 등록 확인 - 성공"""
        secret = "JBSWY3DPEBLW64TMMQ6XAWBW"
        totp = pyotp.TOTP(secret)
        code = totp.now()

        # 시크릿 암호화 (pending secret으로 저장된 상태)
        encrypted_secret = encryption.encrypt(secret)

        # 등록 확인
        success, backup_codes, backup_hashes = \
            await otp_service.verify_and_confirm_enrollment(
                encrypted_secret, code
            )

        assert success is True
        assert len(backup_codes) == 8
        assert len(backup_hashes) == 8

        # 백업 코드 검증
        for code, hashed in zip(backup_codes, backup_hashes):
            # bcrypt 검증
            assert bcrypt.checkpw(code.encode(), hashed.encode())

    @pytest.mark.asyncio
    async def test_verify_and_confirm_enrollment_invalid_code(
        self, otp_service, encryption
    ):
        """OTP 등록 확인 - 유효하지 않은 코드"""
        secret = "JBSWY3DPEBLW64TMMQ6XAWBW"
        encrypted_secret = encryption.encrypt(secret)

        success, backup_codes, backup_hashes = \
            await otp_service.verify_and_confirm_enrollment(
                encrypted_secret, "000000"
            )

        assert success is False
        assert backup_codes == []
        assert backup_hashes == []

    @pytest.mark.asyncio
    async def test_verify_and_confirm_enrollment_corrupted_secret(
        self, otp_service
    ):
        """OTP 등록 확인 - 손상된 시크릿"""
        success, backup_codes, backup_hashes = \
            await otp_service.verify_and_confirm_enrollment(
                "invalid_encrypted_data", "123456"
            )

        assert success is False
        assert backup_codes == []
        assert backup_hashes == []


class TestOTPServiceBackupCodes:
    """백업 코드 관련 테스트"""

    def test_generate_backup_codes_creates_8_codes(self, otp_service):
        """백업 코드 생성 - 8개 생성"""
        codes = otp_service._generate_backup_codes(8)

        assert len(codes) == 8
        # 모든 코드는 8자리 hexadecimal
        for code in codes:
            assert len(code) == 8
            assert all(c in "0123456789ABCDEF" for c in code)

    def test_generate_backup_codes_all_unique(self, otp_service):
        """백업 코드 생성 - 모두 고유"""
        codes = otp_service._generate_backup_codes(100)

        # 중복이 없어야 함 (매우 낮은 확률로만 중복 가능)
        assert len(set(codes)) == len(codes)

    @pytest.mark.asyncio
    async def test_verify_backup_code_success(self, otp_service):
        """백업 코드 검증 - 성공"""
        # 백업 코드 생성 및 해싱
        codes = otp_service._generate_backup_codes(8)
        hashed_codes = [
            bcrypt.hashpw(code.encode(), bcrypt.gensalt()).decode()
            for code in codes
        ]

        # 첫 번째 코드 검증
        success, idx = await otp_service.verify_backup_code(codes[0], hashed_codes)

        assert success is True
        assert idx == 0

    @pytest.mark.asyncio
    async def test_verify_backup_code_failure(self, otp_service):
        """백업 코드 검증 - 실패"""
        codes = otp_service._generate_backup_codes(8)
        hashed_codes = [
            bcrypt.hashpw(code.encode(), bcrypt.gensalt()).decode()
            for code in codes
        ]

        # 존재하지 않는 코드 검증
        success, idx = await otp_service.verify_backup_code("00000000", hashed_codes)

        assert success is False
        assert idx == -1

    @pytest.mark.asyncio
    async def test_verify_backup_code_finds_correct_index(self, otp_service):
        """백업 코드 검증 - 올바른 인덱스 반환"""
        codes = otp_service._generate_backup_codes(8)
        hashed_codes = [
            bcrypt.hashpw(code.encode(), bcrypt.gensalt()).decode()
            for code in codes
        ]

        # 3번째 코드 검증
        success, idx = await otp_service.verify_backup_code(codes[3], hashed_codes)

        assert success is True
        assert idx == 3


class TestOTPServiceConfiguration:
    """서비스 설정 관련 테스트"""

    def test_get_time_window(self, otp_service):
        """타임 윈도우 조회"""
        window = otp_service.get_time_window()
        assert window == 2  # 기본값

    def test_get_max_attempts(self, otp_service):
        """최대 시도 횟수 조회"""
        max_attempts = otp_service.get_max_attempts()
        assert max_attempts == 5  # 기본값


class TestOTPServiceDisable:
    """OTP 비활성화 관련 테스트"""

    @pytest.mark.asyncio
    async def test_disable_otp_returns_true(self, otp_service):
        """OTP 비활성화 - 항상 True 반환"""
        result = await otp_service.disable_otp()
        assert result is True

    @pytest.mark.asyncio
    async def test_admin_disable_otp_returns_true(self, otp_service):
        """관리자 OTP 강제 해제 - 항상 True 반환"""
        result = await otp_service.admin_disable_otp("admin1", "user123")
        assert result is True
