"""Sigma Rule API 엔드포인트 테스트 (변환/재변환 관련)"""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock

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
    with patch("app.api.v1.endpoints.sigma_rule.service") as mock_svc:
        yield mock_svc


@pytest.fixture
def mock_auth():
    app.dependency_overrides[get_current_active_user] = lambda: _mock_user()
    yield
    app.dependency_overrides.pop(get_current_active_user, None)


@pytest.mark.asyncio
async def test_conversion_stats_api_200(mock_service):
    mock_service.get_conversion_stats = AsyncMock(return_value={
        "total": 3100, "success": 3000, "failed": 50, "pending": 30, "skipped": 0, "not_converted": 20,
    })
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/sigma-rules/conversion-stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3100
    assert data["success"] == 3000


@pytest.mark.asyncio
async def test_reconvert_single_api_200(mock_service, mock_auth):
    mock_service.reconvert_single = AsyncMock(return_value={
        "id": "r-1",
        "query_conversion_status": "success",
        "opensearch_query": {"query": {"match_all": {}}},
        "query_pipeline_id": "default",
        "query_converted_at": "2026-03-18T00:00:00",
        "query_conversion_error": None,
    })
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/sigma-rules/r-1/reconvert")
    assert resp.status_code == 200
    data = resp.json()
    assert data["query_conversion_status"] == "success"
    assert data["opensearch_query"] is not None


@pytest.mark.asyncio
async def test_reconvert_single_api_404(mock_service, mock_auth):
    mock_service.reconvert_single = AsyncMock(return_value=None)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/sigma-rules/nonexistent/reconvert")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_bulk_reconvert_api_202(mock_service, mock_auth):
    mock_service.start_bulk_reconvert = AsyncMock(return_value={
        "job_id": "reconvert-20260318-000000",
        "status": "started",
        "requested_count": 0,
    })
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/sigma-rules/reconvert", json={})
    assert resp.status_code == 202
    data = resp.json()
    assert data["status"] == "started"
    assert "job_id" in data


@pytest.mark.asyncio
async def test_bulk_reconvert_api_409(mock_service, mock_auth):
    mock_service.start_bulk_reconvert = AsyncMock(return_value={
        "error": "conflict", "job_id": "rcj-existing",
    })
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/sigma-rules/reconvert", json={})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_list_rules_includes_conversion_status(mock_service):
    mock_service.list_rules = AsyncMock(return_value=(1, [
        {
            "id": "r-1", "type": "sigma", "name": "Test", "level_normalized": "high",
            "status": "active", "tags": [], "mitre_technique_ids": [], "mitre_tactic_ids": [],
            "revision": 1, "query_conversion_status": "success",
        }
    ]))
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/sigma-rules")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"][0]["query_conversion_status"] == "success"


@pytest.mark.asyncio
async def test_get_rule_includes_conversion_fields(mock_service):
    mock_service.get_rule = AsyncMock(return_value={
        "id": "r-1", "type": "sigma", "name": "Test", "level_normalized": "high",
        "status": "active", "tags": [], "mitre_technique_ids": [], "mitre_tactic_ids": [],
        "false_positives": [], "revision": 1,
        "opensearch_query": {"query": {"match_all": {}}},
        "query_conversion_status": "success",
        "query_conversion_error": None,
        "query_pipeline_id": "default",
        "query_converted_at": "2026-03-18T00:00:00",
    })
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/sigma-rules/r-1")
    assert resp.status_code == 200
    data = resp.json()
    assert "opensearch_query" in data
    assert data["query_conversion_status"] == "success"
    assert data["query_pipeline_id"] == "default"
