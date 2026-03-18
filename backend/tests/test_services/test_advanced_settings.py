"""고급 설정 서비스 테스트 — 로그스트리밍 설정 필드 포함, 글로벌/개인 필드 분리"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime

from app.repositories.advanced_settings import AdvancedSettingsRepository
from app.services.advanced_settings import AdvancedSettingsService
from app.models.advanced_settings import AdvancedSettings, GLOBAL_FIELDS, PERSONAL_FIELDS
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

    async def mock_get_settings(user_id="global"):
        return None  # DB에 설정 없음

    async def mock_update_settings(s):
        created_settings["settings"] = s
        return s

    service.repository.get_settings = mock_get_settings
    service.repository.update_settings = mock_update_settings

    result = await service.get_settings()

    assert result.log_stream_size == 1000, "기본 log_stream_size는 1000이어야 합니다"
    assert result.log_stream_refresh == 10, "기본 log_stream_refresh는 10이어야 합니다"


# ───────────── 글로벌/개인 필드 분리 테스트 ─────────────


@pytest.mark.asyncio
async def test_repo_update_user_settings_excludes_global_fields(repo):
    """사용자(비글로벌) 문서 저장 시 글로벌 필드가 저장 body에 포함되지 않아야 함

    cs_policies 인덱스에서 사용자별 문서에는 개인화 필드만 저장되어야 한다.
    글로벌 필드(user_register 등)는 글로벌 문서에만 보관한다.
    """
    captured = {}

    def mock_index(**kwargs):
        captured["body"] = kwargs["body"]

    mock_client = MagicMock()
    mock_client.index.side_effect = mock_index
    repo.client = mock_client

    settings = AdvancedSettings(
        user_register=True,           # 글로벌 필드 — 저장 body에 들어가면 안 됨
        allow_multiple_sessions=True,  # 글로벌 필드
        tab_count=7,
        updated_at=datetime.utcnow(),
        user_id="user-abc",           # 글로벌이 아닌 사용자 ID
        pagination_size=20,
        time_filter_duration=30,
        time_filter_unit="h",
        pixel_mode=False,
        log_stream_size=500,
        log_stream_refresh=20,
        session_duration=60,          # 글로벌 필드
        session_idle_timeout=15,      # 글로벌 필드
        otp_required=True,            # 글로벌 필드
    )

    with patch("asyncio.get_event_loop") as mock_loop:
        mock_loop.return_value.run_in_executor = AsyncMock(
            side_effect=lambda _, fn: fn()
        )
        await repo.update_settings(settings)

    body = captured["body"]

    # 글로벌 필드는 body에 없어야 함
    for field in GLOBAL_FIELDS:
        assert field not in body, f"글로벌 필드 '{field}'가 사용자 문서에 저장되면 안 됩니다"

    # 개인 필드는 body에 있어야 함
    for field in PERSONAL_FIELDS:
        assert field in body, f"개인 필드 '{field}'가 사용자 문서에 저장되어야 합니다"


@pytest.mark.asyncio
async def test_repo_update_global_settings_saves_all_fields(repo):
    """글로벌 문서(user_id='global') 저장 시 모든 필드가 저장 body에 포함되어야 함"""
    captured = {}

    def mock_index(**kwargs):
        captured["body"] = kwargs["body"]

    mock_client = MagicMock()
    mock_client.index.side_effect = mock_index
    repo.client = mock_client

    settings = AdvancedSettings(
        user_register=True,
        allow_multiple_sessions=False,
        tab_count=10,
        updated_at=datetime.utcnow(),
        user_id="global",
        pagination_size=10,
        time_filter_duration=15,
        time_filter_unit="m",
        pixel_mode=False,
        log_stream_size=1000,
        log_stream_refresh=10,
        session_duration=30,
        session_idle_timeout=0,
        otp_required=False,
    )

    with patch("asyncio.get_event_loop") as mock_loop:
        mock_loop.return_value.run_in_executor = AsyncMock(
            side_effect=lambda _, fn: fn()
        )
        await repo.update_settings(settings)

    body = captured["body"]
    for field in GLOBAL_FIELDS | PERSONAL_FIELDS:
        assert field in body, f"글로벌 문서에는 '{field}' 필드가 저장되어야 합니다"


@pytest.mark.asyncio
async def test_service_get_settings_merges_global_fields_for_user(service):
    """사용자 설정 조회 시 글로벌 필드는 반드시 글로벌 문서 값으로 병합되어야 함

    per-user 문서에 글로벌 필드가 없거나 다른 값이 있더라도,
    최종 응답에서는 글로벌 문서의 값이 반영되어야 한다.
    """
    now = datetime.utcnow()

    global_doc = AdvancedSettings(
        user_register=True,
        allow_multiple_sessions=True,
        tab_count=10,
        updated_at=now,
        user_id="global",
        pagination_size=10,
        time_filter_duration=15,
        time_filter_unit="m",
        pixel_mode=False,
        log_stream_size=1000,
        log_stream_refresh=10,
        session_duration=120,
        session_idle_timeout=30,
        otp_required=True,
    )

    user_doc = AdvancedSettings(
        user_register=False,   # 글로벌과 다른 값 (무시되어야 함)
        allow_multiple_sessions=False,
        tab_count=5,
        updated_at=now,
        user_id="user-xyz",
        pagination_size=20,
        time_filter_duration=5,
        time_filter_unit="h",
        pixel_mode=True,
        log_stream_size=500,
        log_stream_refresh=15,
        session_duration=30,   # 글로벌과 다른 값 (무시되어야 함)
        session_idle_timeout=0,
        otp_required=False,    # 글로벌과 다른 값 (무시되어야 함)
    )

    async def mock_get_settings(user_id="global"):
        if user_id == "global":
            return global_doc
        return user_doc

    service.repository.get_settings = mock_get_settings

    result = await service.get_settings("user-xyz")

    # 글로벌 필드는 글로벌 문서 값이어야 함
    assert result.user_register is True, "user_register는 글로벌 값이어야 함"
    assert result.allow_multiple_sessions is True, "allow_multiple_sessions는 글로벌 값이어야 함"
    assert result.session_duration == 120, "session_duration은 글로벌 값이어야 함"
    assert result.session_idle_timeout == 30, "session_idle_timeout은 글로벌 값이어야 함"
    assert result.otp_required is True, "otp_required는 글로벌 값이어야 함"

    # 개인 필드는 사용자 문서 값이어야 함
    assert result.tab_count == 5, "tab_count는 사용자 개인 값이어야 함"
    assert result.pagination_size == 20, "pagination_size는 사용자 개인 값이어야 함"
    assert result.pixel_mode is True, "pixel_mode는 사용자 개인 값이어야 함"
