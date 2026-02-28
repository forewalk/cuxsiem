"""고급 설정 서비스 테스트 — 로그스트리밍 설정 필드 포함"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime

from app.repositories.advanced_settings import AdvancedSettingsRepository
from app.services.advanced_settings import AdvancedSettingsService
from app.models.advanced_settings import AdvancedSettings
from app.schemas.advanced_settings import AdvancedSettingsUpdate


@pytest.fixture
def repo():
    return AdvancedSettingsRepository()


@pytest.fixture
def service():
    return AdvancedSettingsService()


@pytest.mark.asyncio
async def test_get_settings_includes_log_stream_fields(repo):
    """설정 조회 시 log_stream_size, log_stream_refresh 필드가 포함되어야 함

    고급 설정에 새로 추가된 로그스트리밍 설정 필드가
    레포지토리 조회 시 올바른 기본값으로 반환되어야 한다.
    """
    now = datetime.utcnow()
    mock_data = {
        "user_register": False,
        "allow_multiple_sessions": False,
        "tab_count": 10,
        "updated_at": now.isoformat(),
        "pagination_size": 10,
        "time_filter_duration": 15,
        "time_filter_unit": "m",
        "pixel_mode": False,
        # log_stream 필드 없음 → 기본값으로 처리되어야 함
    }

    def mock_get(**kwargs):
        return {"_source": mock_data}

    mock_client = MagicMock()
    mock_client.get.side_effect = mock_get
    repo.client = mock_client

    with patch("asyncio.get_event_loop") as mock_loop:
        mock_loop.return_value.run_in_executor = AsyncMock(
            side_effect=lambda _, fn: fn()
        )
        settings = await repo.get_settings()

    assert settings is not None
    # log_stream_size 기본값: 1000
    assert settings.log_stream_size == 1000, "log_stream_size 기본값은 1000이어야 합니다"
    # log_stream_refresh 기본값: 10
    assert settings.log_stream_refresh == 10, "log_stream_refresh 기본값은 10이어야 합니다"


@pytest.mark.asyncio
async def test_get_settings_reads_custom_log_stream_values(repo):
    """설정 조회 시 커스텀 log_stream_size, log_stream_refresh 값이 올바르게 읽혀야 함"""
    now = datetime.utcnow()
    mock_data = {
        "user_register": True,
        "allow_multiple_sessions": True,
        "tab_count": 5,
        "updated_at": now.isoformat(),
        "pagination_size": 20,
        "time_filter_duration": 30,
        "time_filter_unit": "m",
        "pixel_mode": False,
        "log_stream_size": 5000,    # 커스텀 값
        "log_stream_refresh": 30,   # 커스텀 값
    }

    def mock_get(**kwargs):
        return {"_source": mock_data}

    mock_client = MagicMock()
    mock_client.get.side_effect = mock_get
    repo.client = mock_client

    with patch("asyncio.get_event_loop") as mock_loop:
        mock_loop.return_value.run_in_executor = AsyncMock(
            side_effect=lambda _, fn: fn()
        )
        settings = await repo.get_settings()

    assert settings.log_stream_size == 5000, "커스텀 log_stream_size가 읽혀야 합니다"
    assert settings.log_stream_refresh == 30, "커스텀 log_stream_refresh가 읽혀야 합니다"


@pytest.mark.asyncio
async def test_update_settings_saves_log_stream_fields(repo):
    """설정 저장 시 log_stream_size, log_stream_refresh 필드가 저장되어야 함"""
    captured = {}

    def mock_index(**kwargs):
        captured["body"] = kwargs["body"]

    mock_client = MagicMock()
    mock_client.index.side_effect = mock_index
    repo.client = mock_client

    settings = AdvancedSettings(
        user_register=False,
        allow_multiple_sessions=False,
        tab_count=10,
        updated_at=datetime.utcnow(),
        pagination_size=10,
        time_filter_duration=15,
        time_filter_unit="m",
        pixel_mode=False,
        log_stream_size=2000,
        log_stream_refresh=15,
    )

    with patch("asyncio.get_event_loop") as mock_loop:
        mock_loop.return_value.run_in_executor = AsyncMock(
            side_effect=lambda _, fn: fn()
        )
        await repo.update_settings(settings)

    body = captured["body"]
    assert "log_stream_size" in body, "log_stream_size가 저장 데이터에 있어야 합니다"
    assert body["log_stream_size"] == 2000
    assert "log_stream_refresh" in body, "log_stream_refresh가 저장 데이터에 있어야 합니다"
    assert body["log_stream_refresh"] == 15


@pytest.mark.asyncio
async def test_service_default_settings_includes_log_stream(service):
    """서비스에서 설정이 없을 때 기본 로그스트리밍 설정이 생성되어야 함"""
    created_settings = {}

    async def mock_get_settings():
        return None  # DB에 설정 없음

    async def mock_update_settings(s):
        created_settings["settings"] = s
        return s

    service.repository.get_settings = mock_get_settings
    service.repository.update_settings = mock_update_settings

    result = await service.get_settings()

    assert result.log_stream_size == 1000, "기본 log_stream_size는 1000이어야 합니다"
    assert result.log_stream_refresh == 10, "기본 log_stream_refresh는 10이어야 합니다"
