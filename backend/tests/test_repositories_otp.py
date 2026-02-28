"""OTP Repository 테스트"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import MagicMock, AsyncMock, patch
from app.repositories.user import UserRepository
from app.models.otp import OTPConfig


@pytest.fixture
def mock_opensearch_client():
    """Mock OpenSearch 클라이언트"""
    mock = MagicMock()
    return mock


@pytest.fixture
def user_repository(mock_opensearch_client):
    """User Repository 인스턴스 (mocked)"""
    with patch('app.repositories.user.get_opensearch_client', return_value=mock_opensearch_client):
        repo = UserRepository()
        repo.client = mock_opensearch_client
        return repo


class TestUserRepositoryOTPMethods:
    """UserRepository OTP 메서드 테스트"""

    @pytest.mark.asyncio
    async def test_update_otp_field_success(self, user_repository, mock_opensearch_client):
        """단일 OTP 필드 업데이트 - 성공"""
        mock_opensearch_client.update.return_value = {"result": "updated"}

        user_id = "user123"
        field_name = "otp_secret_enc"
        field_value = "encrypted_secret_abc123"

        result = await user_repository.update_otp_field(user_id, field_name, field_value)

        assert result is True
        mock_opensearch_client.update.assert_called_once()
        call_kwargs = mock_opensearch_client.update.call_args[1]
        assert call_kwargs["index"] == "cs_users"
        assert call_kwargs["id"] == user_id
        assert call_kwargs["body"]["doc"][field_name] == field_value
        assert call_kwargs["refresh"] is True

    @pytest.mark.asyncio
    async def test_update_otp_field_failure(self, user_repository, mock_opensearch_client):
        """단일 OTP 필드 업데이트 - 실패"""
        mock_opensearch_client.update.side_effect = Exception("Connection error")

        result = await user_repository.update_otp_field("user123", "otp_enabled", True)

        assert result is False

    @pytest.mark.asyncio
    async def test_update_otp_config_full_update(self, user_repository, mock_opensearch_client):
        """OTP 설정 전체 업데이트"""
        mock_opensearch_client.update.return_value = {"result": "updated"}

        user_id = "user123"
        otp_config = {
            "otp_enabled": True,
            "otp_secret_enc": "encrypted_secret",
            "otp_pending_secret_enc": "pending_secret",  # 제거됨
            "otp_backup_codes": ["code1", "code2"],
            "otp_enrolled_at": datetime.utcnow().isoformat()
        }

        result = await user_repository.update_otp_config(user_id, otp_config)

        assert result is True
        mock_opensearch_client.update.assert_called_once()
        call_kwargs = mock_opensearch_client.update.call_args[1]

        # pending secret은 None으로 설정되어야 함
        assert call_kwargs["body"]["doc"]["otp_pending_secret_enc"] is None
        # enabled와 backup_codes는 유지되어야 함
        assert call_kwargs["body"]["doc"]["otp_enabled"] is True
        assert call_kwargs["body"]["doc"]["otp_backup_codes"] == ["code1", "code2"]
        # updated_at이 추가되어야 함
        assert "updated_at" in call_kwargs["body"]["doc"]

    @pytest.mark.asyncio
    async def test_update_otp_config_failure(self, user_repository, mock_opensearch_client):
        """OTP 설정 업데이트 - 실패"""
        mock_opensearch_client.update.side_effect = Exception("Network error")

        config = {"otp_enabled": True}
        result = await user_repository.update_otp_config("user123", config)

        assert result is False

    @pytest.mark.asyncio
    async def test_clear_otp_fields_success(self, user_repository, mock_opensearch_client):
        """모든 OTP 필드 삭제 - 성공"""
        mock_opensearch_client.update.return_value = {"result": "updated"}

        result = await user_repository.clear_otp_fields("user123")

        assert result is True
        mock_opensearch_client.update.assert_called_once()
        call_kwargs = mock_opensearch_client.update.call_args[1]

        # 모든 OTP 필드가 None 또는 False로 설정되어야 함
        doc = call_kwargs["body"]["doc"]
        assert doc["otp_enabled"] is False
        assert doc["otp_secret_enc"] is None
        assert doc["otp_pending_secret_enc"] is None
        assert doc["otp_backup_codes"] is None
        assert doc["otp_enrolled_at"] is None
        assert "updated_at" in doc

    @pytest.mark.asyncio
    async def test_clear_otp_fields_failure(self, user_repository, mock_opensearch_client):
        """모든 OTP 필드 삭제 - 실패"""
        mock_opensearch_client.update.side_effect = Exception("OpenSearch error")

        result = await user_repository.clear_otp_fields("user123")

        assert result is False

    @pytest.mark.asyncio
    async def test_get_user_otp_status_enabled(self, user_repository, mock_opensearch_client):
        """사용자 OTP 상태 조회 - 활성화됨"""
        now = datetime.utcnow().isoformat()
        mock_opensearch_client.get.return_value = {
            "_id": "user123",
            "_source": {
                "otp_enabled": True,
                "otp_enrolled_at": now,
                "otp_backup_codes": ["code1", "code2", "code3"],
                "otp_pending_secret_enc": None
            }
        }

        status = await user_repository.get_user_otp_status("user123")

        assert status is not None
        assert status["enabled"] is True
        assert status["enrolled_at"] == now
        assert status["backup_codes_count"] == 3
        assert status["is_pending"] is False

    @pytest.mark.asyncio
    async def test_get_user_otp_status_pending(self, user_repository, mock_opensearch_client):
        """사용자 OTP 상태 조회 - 등록 진행 중"""
        mock_opensearch_client.get.return_value = {
            "_id": "user123",
            "_source": {
                "otp_enabled": False,
                "otp_enrolled_at": None,
                "otp_backup_codes": [],
                "otp_pending_secret_enc": "pending_encrypted_secret"
            }
        }

        status = await user_repository.get_user_otp_status("user123")

        assert status is not None
        assert status["enabled"] is False
        assert status["enrolled_at"] is None
        assert status["backup_codes_count"] == 0
        assert status["is_pending"] is True

    @pytest.mark.asyncio
    async def test_get_user_otp_status_not_found(self, user_repository, mock_opensearch_client):
        """사용자 OTP 상태 조회 - 사용자 없음"""
        mock_opensearch_client.get.side_effect = Exception("Not found")

        status = await user_repository.get_user_otp_status("nonexistent_user")

        assert status is None

    @pytest.mark.asyncio
    async def test_get_user_otp_status_with_missing_fields(self, user_repository, mock_opensearch_client):
        """사용자 OTP 상태 조회 - 필드 일부 누락"""
        mock_opensearch_client.get.return_value = {
            "_id": "user123",
            "_source": {
                # otp_enabled, otp_enrolled_at, otp_pending_secret_enc 없음
                "otp_backup_codes": ["code1"]
            }
        }

        status = await user_repository.get_user_otp_status("user123")

        assert status is not None
        assert status["enabled"] is False  # 기본값
        assert status["enrolled_at"] is None
        assert status["backup_codes_count"] == 1
        assert status["is_pending"] is False  # 기본값


class TestOTPConfigDataModel:
    """OTPConfig 데이터 모델 테스트"""

    def test_otp_config_to_dict_for_opensearch(self):
        """OTPConfig를 OpenSearch 저장용으로 변환"""
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
        assert doc["otp_pending_secret_enc"] is None
        assert doc["otp_backup_codes"] == ["code1", "code2"]
        assert doc["otp_enrolled_at"] == now.isoformat()

    def test_otp_config_from_opensearch_document(self):
        """OpenSearch 문서에서 OTPConfig 생성"""
        now = datetime.utcnow()
        doc = {
            "otp_enabled": True,
            "otp_secret_enc": "encrypted_secret",
            "otp_pending_secret_enc": None,
            "otp_backup_codes": ["code1", "code2", "code3"],
            "otp_enrolled_at": now.isoformat()
        }

        config = OTPConfig.from_dict(doc)

        assert config.enabled is True
        assert config.secret_enc == "encrypted_secret"
        assert config.pending_secret_enc is None
        assert config.backup_codes == ["code1", "code2", "code3"]
        assert config.enrolled_at.isoformat() == now.isoformat()
