"""로그인 시도 기록 테스트 — account 필드 기반"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime

from app.repositories.login_attempt import LoginAttemptRepository
from app.models.user import LoginAttempt


@pytest.fixture
def repo():
    return LoginAttemptRepository()


@pytest.mark.asyncio
async def test_record_uses_account_field(repo):
    """record()가 account 필드로 저장하는지 확인"""
    captured = {}

    def mock_index(**kwargs):
        captured["body"] = kwargs["body"]

    mock_client = MagicMock()
    mock_client.index.side_effect = mock_index
    repo.client = mock_client

    with patch("asyncio.get_event_loop") as mock_loop:
        mock_loop.return_value.run_in_executor = AsyncMock(
            side_effect=lambda _, fn: fn()
        )
        await repo.record(
            account="testuser",
            success=False,
            ip_address="192.168.1.100",
            error_message="Invalid password",
        )

    body = captured["body"]
    assert "account" in body
    assert body["account"] == "testuser"
    assert "email" not in body
    assert body["success"] is False
    assert body["ip_address"] == "192.168.1.100"


@pytest.mark.asyncio
async def test_count_failed_attempts_queries_account_field(repo):
    """count_failed_attempts()가 account 필드로 쿼리하는지 확인"""
    captured = {}

    def mock_search(**kwargs):
        captured["query"] = kwargs["body"]["query"]
        return {"hits": {"total": {"value": 3}}}

    mock_client = MagicMock()
    mock_client.search.side_effect = mock_search
    repo.client = mock_client

    with patch("asyncio.get_event_loop") as mock_loop:
        mock_loop.return_value.run_in_executor = AsyncMock(
            side_effect=lambda _, fn: fn()
        )
        count = await repo.count_failed_attempts(account="testuser", minutes=10)

    assert count == 3
    must_clauses = captured["query"]["bool"]["must"]
    account_term = next(
        (c for c in must_clauses if "term" in c and "account" in c["term"]), None
    )
    assert account_term is not None, "account 필드로 쿼리해야 합니다"
    assert "email" not in str(captured["query"]), "email 필드가 쿼리에 없어야 합니다"
