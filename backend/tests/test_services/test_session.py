"""세션 레포지토리 테스트 — 만료 세션 필터링"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timedelta

from app.repositories.session import SessionRepository


@pytest.fixture
def repo():
    return SessionRepository()


@pytest.mark.asyncio
async def test_get_active_sessions_includes_expires_at_filter(repo):
    """get_active_sessions_by_user_id() 쿼리에 expires_at > now 조건이 포함되어야 함

    다중 접속 허용 비활성화 시 만료된 세션을 활성 세션으로 오인하지 않도록,
    OpenSearch 쿼리에 expires_at range 조건이 반드시 포함되어야 한다.
    """
    captured = {}

    def mock_search(**kwargs):
        captured["query"] = kwargs["body"]["query"]
        return {"hits": {"hits": []}}

    mock_client = MagicMock()
    mock_client.search.side_effect = mock_search
    repo.client = mock_client

    with patch("asyncio.get_event_loop") as mock_loop:
        mock_loop.return_value.run_in_executor = AsyncMock(
            side_effect=lambda _, fn: fn()
        )
        await repo.get_active_sessions_by_user_id("user123")

    must_clauses = captured["query"]["bool"]["must"]

    # is_active=True 조건 확인
    is_active_clause = next(
        (c for c in must_clauses if "term" in c and "is_active" in c["term"]), None
    )
    assert is_active_clause is not None, "is_active=True 조건이 있어야 합니다"
    assert is_active_clause["term"]["is_active"] is True

    # expires_at > now range 조건 확인 (만료 세션 필터링 핵심)
    expires_at_clause = next(
        (c for c in must_clauses if "range" in c and "expires_at" in c["range"]), None
    )
    assert expires_at_clause is not None, "expires_at range 조건이 있어야 합니다"
    assert "gt" in expires_at_clause["range"]["expires_at"], "만료 시간보다 미래인 조건(gt)이어야 합니다"


@pytest.mark.asyncio
async def test_get_active_sessions_returns_only_non_expired(repo):
    """만료된 세션은 활성 세션 목록에 포함되지 않아야 함

    is_active=True이더라도 expires_at이 현재 시간보다 과거인 세션은
    활성 세션 목록에 포함되지 않아야 한다. (다중 접속 오탐 방지)
    """
    now = datetime.utcnow()
    expired_session_data = {
        "_id": "session1",
        "_source": {
            "user_id": "user123",
            "token_hash": "hash1",
            "ip_address": "192.168.1.1",
            "user_agent": "TestBrowser",
            "created_at": (now - timedelta(hours=2)).isoformat(),
            "expires_at": (now - timedelta(hours=1)).isoformat(),  # 이미 만료됨
            "is_active": True,  # DB에는 active지만 expires_at 과거
        }
    }

    def mock_search(**kwargs):
        query = kwargs["body"]["query"]
        must_clauses = query["bool"]["must"]
        # expires_at > now 조건이 있으면 만료된 세션은 반환하지 않음
        has_expires_filter = any(
            "range" in c and "expires_at" in c["range"] for c in must_clauses
        )
        if has_expires_filter:
            return {"hits": {"hits": []}}  # 만료 세션 필터링됨
        return {"hits": {"hits": [expired_session_data]}}

    mock_client = MagicMock()
    mock_client.search.side_effect = mock_search
    repo.client = mock_client

    with patch("asyncio.get_event_loop") as mock_loop:
        mock_loop.return_value.run_in_executor = AsyncMock(
            side_effect=lambda _, fn: fn()
        )
        sessions = await repo.get_active_sessions_by_user_id("user123")

    # expires_at 필터가 적용되어 만료 세션은 반환되지 않아야 함
    assert len(sessions) == 0, "만료된 세션은 활성 목록에 포함되지 않아야 합니다"
