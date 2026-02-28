"""AES-256-GCM 암호화 유틸리티"""

import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from typing import Optional


class AESEncryption:
    """AES-256-GCM 암호화/복호화 클래스

    시크릿 키와 TOTP 시크릿을 안전하게 암호화합니다.
    nonce(12 bytes) + ciphertext + tag는 base64로 인코딩되어 저장됩니다.
    """

    def __init__(self, key: str):
        """초기화

        Args:
            key: 최소 32바이트의 암호화 키 (환경변수에서 로드)

        Raises:
            ValueError: 키 길이가 32바이트 미만인 경우
        """
        if not key:
            raise ValueError("Encryption key must be provided")

        # 32바이트 이상이면 처음 32바이트 사용
        key_bytes = key.encode() if isinstance(key, str) else key
        if len(key_bytes) < 32:
            raise ValueError("Encryption key must be at least 32 bytes")

        self.key = key_bytes[:32]

    def encrypt(self, plaintext: str) -> str:
        """평문을 AES-256-GCM으로 암호화

        Args:
            plaintext: 암호화할 평문

        Returns:
            base64로 인코딩된 암호문 (nonce + ciphertext + tag)

        Raises:
            ValueError: 입력이 유효하지 않은 경우
        """
        if not plaintext:
            raise ValueError("Plaintext cannot be empty")

        try:
            # 12바이트 난수 생성 (GCM의 권장 크기)
            nonce = os.urandom(12)

            # AES-256-GCM 암호화 (Authenticated Encryption)
            cipher = AESGCM(self.key)
            ciphertext = cipher.encrypt(
                nonce,
                plaintext.encode('utf-8'),
                None  # Additional authenticated data: 없음
            )

            # nonce + ciphertext (tag 포함) 결합
            encrypted = nonce + ciphertext

            # base64 인코딩
            encoded = base64.b64encode(encrypted).decode('utf-8')

            return encoded
        except Exception as e:
            raise ValueError(f"Encryption failed: {str(e)}")

    def decrypt(self, encrypted: str) -> str:
        """base64로 인코딩된 암호문을 복호화

        Args:
            encrypted: base64로 인코딩된 암호문

        Returns:
            복호화된 평문

        Raises:
            ValueError: 복호화 실패 또는 검증 실패
        """
        if not encrypted:
            raise ValueError("Encrypted text cannot be empty")

        try:
            # base64 디코딩
            encrypted_bytes = base64.b64decode(encrypted.encode('utf-8'))

            # nonce와 ciphertext 분리
            # nonce: 처음 12바이트
            nonce = encrypted_bytes[:12]
            # ciphertext: 나머지 (tag 포함)
            ciphertext = encrypted_bytes[12:]

            if len(nonce) != 12:
                raise ValueError("Invalid nonce length")

            # AES-256-GCM 복호화
            cipher = AESGCM(self.key)
            plaintext = cipher.decrypt(
                nonce,
                ciphertext,
                None  # Additional authenticated data: 없음
            )

            return plaintext.decode('utf-8')
        except Exception as e:
            raise ValueError(f"Decryption failed: {str(e)}")


def get_encryption_key() -> str:
    """환경변수에서 암호화 키 로드

    Returns:
        암호화 키

    Raises:
        ValueError: OTP_ENCRYPTION_KEY 환경변수가 설정되지 않은 경우
    """
    key = os.getenv('OTP_ENCRYPTION_KEY')
    if not key:
        raise ValueError(
            "OTP_ENCRYPTION_KEY environment variable is not set. "
            "Please set a 32-byte or longer encryption key."
        )
    return key
