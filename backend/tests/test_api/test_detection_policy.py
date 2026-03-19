"""Detector API 엔드포인트 테스트 (Phase 2 신규 필드 검증)"""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch

from app.main import app
from app.api.v1.deps import get_current_active_user
from app.schemas.user import UserResponse


def _mock_user():
    return UserResponse(
        id="user-1", email="admin@example.com", name="Admin", role="admin",
        is_active=True, created_at="2026-01-01T00:00:00", updated_at="2026-01-01T00:00:00",
    )


@pytest.fixture
def mock_service():
    with patch("app.api.v1.endpoints.detection_policy.service") as mock_svc:
        yield mock_svc


@pytest.fixture
def mock_auth():
    app.dependency_overrides[get_current_active_user] = lambda: _mock_user()
    yield
    app.dependency_overrides.pop(get_current_active_user, None)


@pytest.mark.asyncio
async def test_create_detector_with_new_fields(mock_service, mock_auth):
    """timestamp_field, max_search_window_min 포함 생성 → 201, 응답에 두 필드 포함"""
    mock_service.create_detector = AsyncMock(return_value={
        "id": "d1", "name": "Test Detector", "detector_type": "windows",
        "target_indices": ["logs-test"], "linked_rule_ids": [], "field_mappings": [],
        "schedule_interval_min": 5, "severity": "high", "is_active": True,
        "timestamp_field": "event.created", "max_search_window_min": 120,
        "total_findings_count": 0,
    })

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/detection-policies", json={
            "name": "Test Detector",
            "detector_type": "windows",
            "target_indices": ["logs-test"],
            "schedule_interval_min": 5,
            "severity": "high",
            "timestamp_field": "event.created",
            "max_search_window_min": 120,
        })

    assert resp.status_code == 201
    data = resp.json()
    assert data["timestamp_field"] == "event.created"
    assert data["max_search_window_min"] == 120


@pytest.mark.asyncio
async def test_create_detector_invalid_window(mock_auth):
    """max_search_window_min=3 (범위 밖) → 422"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/detection-policies", json={
            "name": "Bad Detector",
            "detector_type": "windows",
            "target_indices": ["logs-test"],
            "schedule_interval_min": 5,
            "max_search_window_min": 3,
        })

    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_update_detector_timestamp_field(mock_service, mock_auth):
    """timestamp_field 수정 → 200, 변경 반영"""
    mock_service.update_detector = AsyncMock(return_value={
        "id": "d1", "name": "Updated Detector", "detector_type": "windows",
        "target_indices": ["logs-test"], "linked_rule_ids": [], "field_mappings": [],
        "schedule_interval_min": 5, "severity": "medium", "is_active": True,
        "timestamp_field": "event.timestamp", "max_search_window_min": 1440,
        "total_findings_count": 0,
    })

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.put("/api/v1/detection-policies/d1", json={
            "timestamp_field": "event.timestamp",
        })

    assert resp.status_code == 200
    data = resp.json()
    assert data["timestamp_field"] == "event.timestamp"


@pytest.mark.asyncio
async def test_get_detector_includes_new_fields(mock_service):
    """조회 시 신규 필드 포함 (기본값: @timestamp, 1440)"""
    mock_service.get_detector = AsyncMock(return_value={
        "id": "d1", "name": "My Detector", "detector_type": "windows",
        "target_indices": ["logs-test"], "linked_rule_ids": [], "field_mappings": [],
        "schedule_interval_min": 5, "severity": "medium", "is_active": True,
        "timestamp_field": "@timestamp", "max_search_window_min": 1440,
        "total_findings_count": 10,
    })

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/detection-policies/d1")

    assert resp.status_code == 200
    data = resp.json()
    assert data["timestamp_field"] == "@timestamp"
    assert data["max_search_window_min"] == 1440
