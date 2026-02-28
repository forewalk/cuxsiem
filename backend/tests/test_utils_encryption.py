"""AES-256-GCM 암호화 유틸리티 테스트"""

import pytest
from app.utils.encryption import AESEncryption, get_encryption_key
import os


class TestAESEncryption:
    """AES-256-GCM 암호화 테스트"""

    @pytest.fixture
    def encryption_key(self):
        """테스트용 32바이트 암호화 키"""
        return "a" * 32

    @pytest.fixture
    def encryptor(self, encryption_key):
        """암호화 객체"""
        return AESEncryption(encryption_key)

    def test_initialization_with_valid_key(self, encryption_key):
        """정상적인 키로 초기화 성공"""
        enc = AESEncryption(encryption_key)
        assert enc.key == encryption_key.encode()[:32]

    def test_initialization_with_long_key(self):
        """32바이트 이상의 긴 키를 받으면 처음 32바이트만 사용"""
        long_key = "a" * 64
        enc = AESEncryption(long_key)
        assert enc.key == long_key.encode()[:32]

    def test_initialization_fails_with_short_key(self):
        """32바이트 미만 키로는 초기화 실패"""
        short_key = "a" * 31
        with pytest.raises(ValueError, match="at least 32 bytes"):
            AESEncryption(short_key)

    def test_initialization_fails_with_empty_key(self):
        """빈 키로는 초기화 실패"""
        with pytest.raises(ValueError):
            AESEncryption("")

    def test_encrypt_and_decrypt_totp_secret(self, encryptor):
        """TOTP 시크릿 암호화 및 복호화"""
        plaintext = "JBSWY3DPEBLW64TMMQ6XAWBW"
        encrypted = encryptor.encrypt(plaintext)

        # 암호화된 결과는 base64 문자열
        assert isinstance(encrypted, str)
        assert len(encrypted) > 0
        # base64는 알파벳, 숫자, +, /, =만 포함
        import re
        assert re.match(r'^[A-Za-z0-9+/]*={0,2}$', encrypted), "암호화된 결과는 base64 형식이어야 함"

        # 복호화
        decrypted = encryptor.decrypt(encrypted)
        assert decrypted == plaintext

    def test_encrypt_and_decrypt_json(self, encryptor):
        """JSON 형식 데이터 암호화 및 복호화"""
        import json
        data = {
            "user_id": "user123",
            "timestamp": "2026-03-01T10:30:45Z"
        }
        plaintext = json.dumps(data)
        encrypted = encryptor.encrypt(plaintext)
        decrypted = encryptor.decrypt(encrypted)
        assert json.loads(decrypted) == data

    def test_encrypt_generates_different_ciphertexts(self, encryptor):
        """동일한 평문도 매번 다른 암호문 생성 (난수 때문에)"""
        plaintext = "JBSWY3DPEBLW64TMMQ6XAWBW"
        encrypted1 = encryptor.encrypt(plaintext)
        encrypted2 = encryptor.encrypt(plaintext)

        # 같은 평문이지만 다른 난수 때문에 다른 암호문
        assert encrypted1 != encrypted2
        # 둘 다 정상적으로 복호화되어야 함
        assert encryptor.decrypt(encrypted1) == plaintext
        assert encryptor.decrypt(encrypted2) == plaintext

    def test_encrypt_fails_with_empty_plaintext(self, encryptor):
        """빈 평문은 암호화 실패"""
        with pytest.raises(ValueError, match="cannot be empty"):
            encryptor.encrypt("")

    def test_decrypt_fails_with_empty_encrypted(self, encryptor):
        """빈 암호문은 복호화 실패"""
        with pytest.raises(ValueError, match="cannot be empty"):
            encryptor.decrypt("")

    def test_decrypt_fails_with_invalid_base64(self, encryptor):
        """유효하지 않은 base64는 복호화 실패"""
        with pytest.raises(ValueError, match="Decryption failed"):
            encryptor.decrypt("not valid base64!!!!")

    def test_decrypt_fails_with_corrupted_data(self, encryptor):
        """손상된 데이터는 복호화 실패"""
        plaintext = "JBSWY3DPEBLW64TMMQ6XAWBW"
        encrypted = encryptor.encrypt(plaintext)

        # 암호문 일부를 손상시킴
        import base64
        encrypted_bytes = base64.b64decode(encrypted)
        corrupted_bytes = bytearray(encrypted_bytes)
        corrupted_bytes[20] ^= 0xFF  # 바이트 반전

        corrupted_encrypted = base64.b64encode(bytes(corrupted_bytes)).decode()

        with pytest.raises(ValueError, match="Decryption failed"):
            encryptor.decrypt(corrupted_encrypted)

    def test_decrypt_fails_with_wrong_key(self, encryption_key):
        """다른 키로 복호화하면 실패"""
        encryptor1 = AESEncryption(encryption_key)
        plaintext = "JBSWY3DPEBLW64TMMQ6XAWBW"
        encrypted = encryptor1.encrypt(plaintext)

        # 다른 키로 초기화
        wrong_key = "b" * 32
        encryptor2 = AESEncryption(wrong_key)

        with pytest.raises(ValueError, match="Decryption failed"):
            encryptor2.decrypt(encrypted)

    def test_long_plaintext(self, encryptor):
        """긴 평문도 암호화/복호화 성공"""
        plaintext = "a" * 10000
        encrypted = encryptor.encrypt(plaintext)
        decrypted = encryptor.decrypt(encrypted)
        assert decrypted == plaintext

    def test_special_characters(self, encryptor):
        """특수문자 포함 평문 암호화/복호화"""
        plaintext = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`한글テスト"
        encrypted = encryptor.encrypt(plaintext)
        decrypted = encryptor.decrypt(encrypted)
        assert decrypted == plaintext


class TestOTPModels:
    """OTP 모델 테스트"""

    def test_otp_config_initialization(self):
        """OTPConfig 초기화"""
        from app.models.otp import OTPConfig
        config = OTPConfig()
        assert config.enabled is False
        assert config.secret_enc is None
        assert config.pending_secret_enc is None
        assert config.backup_codes == []
        assert config.enrolled_at is None

    def test_otp_config_to_dict(self):
        """OTPConfig를 OpenSearch 문서로 변환"""
        from app.models.otp import OTPConfig
        from datetime import datetime

        now = datetime.utcnow()
        config = OTPConfig(
            enabled=True,
            secret_enc="encrypted_secret",
            backup_codes=["code1", "code2"],
            enrolled_at=now
        )

        doc = config.to_dict()
        assert doc["otp_enabled"] is True
        assert doc["otp_secret_enc"] == "encrypted_secret"
        assert doc["otp_backup_codes"] == ["code1", "code2"]
        assert doc["otp_enrolled_at"] == now.isoformat()

    def test_otp_config_from_dict(self):
        """OpenSearch 문서에서 OTPConfig 생성"""
        from app.models.otp import OTPConfig
        from datetime import datetime

        now = datetime.utcnow()
        doc = {
            "otp_enabled": True,
            "otp_secret_enc": "encrypted_secret",
            "otp_pending_secret_enc": None,
            "otp_backup_codes": ["code1", "code2"],
            "otp_enrolled_at": now.isoformat()
        }

        config = OTPConfig.from_dict(doc)
        assert config.enabled is True
        assert config.secret_enc == "encrypted_secret"
        assert config.backup_codes == ["code1", "code2"]

    def test_otp_config_is_enrolled(self):
        """OTPConfig.is_enrolled() 메서드"""
        from app.models.otp import OTPConfig

        # enrolled (활성화 + 시크릿 존재)
        config1 = OTPConfig(enabled=True, secret_enc="secret")
        assert config1.is_enrolled() is True

        # not enrolled (활성화되었지만 시크릿 없음)
        config2 = OTPConfig(enabled=True, secret_enc=None)
        assert config2.is_enrolled() is False

        # not enrolled (비활성화)
        config3 = OTPConfig(enabled=False)
        assert config3.is_enrolled() is False

    def test_otp_config_has_backup_codes(self):
        """OTPConfig.has_backup_codes() 메서드"""
        from app.models.otp import OTPConfig

        config1 = OTPConfig(backup_codes=["code1", "code2"])
        assert config1.has_backup_codes() == 2

        config2 = OTPConfig(backup_codes=[])
        assert config2.has_backup_codes() == 0

    def test_otp_status_from_config(self):
        """OTPStatus.from_config() 메서드"""
        from app.models.otp import OTPConfig, OTPStatus
        from datetime import datetime

        now = datetime.utcnow()
        config = OTPConfig(
            enabled=True,
            secret_enc="secret",
            backup_codes=["code1", "code2"],
            enrolled_at=now
        )

        status = OTPStatus.from_config(config)
        assert status.enabled is True
        assert status.is_pending is False
        assert status.backup_codes_count == 2
        assert status.enrolled_at == now.isoformat()
