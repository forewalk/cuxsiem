"""Evaluator 단위 테스트 — HealthCheck + Auth"""
import pytest
from unittest.mock import patch, MagicMock

from app.services.evaluators.healthcheck import HealthCheckEvaluator
from app.services.evaluators.auth import AuthEvaluator


@pytest.fixture
def evaluator():
    ev = HealthCheckEvaluator()
    ev._client = MagicMock()
    return ev


def _make_heartbeat_hit(name: str, status: str = "up", duration_us: int = 1000,
                        url: str = "https://example.com",
                        cert_not_after: str | None = None) -> dict:
    """heartbeat 문서 팩토리"""
    src = {
        "@timestamp": "2026-03-24T09:00:00Z",
        "monitor": {
            "id": f"monitor-{name}",
            "name": name,
            "status": status,
            "type": "http",
            "duration": {"us": duration_us},
        },
        "url": {"full": url, "scheme": "https", "domain": "example.com"},
        "tls": {},
    }
    if cert_not_after:
        src["tls"] = {
            "certificate_not_valid_after": cert_not_after,
            "server": {"x509": {"subject": {"common_name": f"*.{name}.com"}}},
        }
    return src


def _wrap_search_response(hits: list[dict]) -> dict:
    return {
        "hits": {
            "total": {"value": len(hits)},
            "hits": [{"_source": h} for h in hits],
        }
    }


# --- status_down ---

@pytest.mark.asyncio
async def test_status_down_triggered(evaluator):
    evaluator.client.search.return_value = _wrap_search_response([
        _make_heartbeat_hit("web-01", status="down"),
        _make_heartbeat_hit("web-02", status="down"),
    ])

    result = await evaluator.evaluate({"condition": "status_down", "monitor_filter": "web-*"})

    assert result.triggered is True
    assert result.matched_count == 2
    assert result.template_context["status"] == "down"
    assert result.template_context["monitor_count"] == "2"


@pytest.mark.asyncio
async def test_status_down_not_triggered(evaluator):
    evaluator.client.search.return_value = _wrap_search_response([])

    result = await evaluator.evaluate({"condition": "status_down", "monitor_filter": "*"})

    assert result.triggered is False
    assert result.matched_count == 0


# --- latency_high ---

@pytest.mark.asyncio
async def test_latency_high_triggered(evaluator):
    evaluator.client.search.return_value = _wrap_search_response([
        _make_heartbeat_hit("api-01", duration_us=6_000_000),
    ])

    result = await evaluator.evaluate({
        "condition": "latency_high",
        "monitor_filter": "*",
        "latency_threshold_ms": 5000,
    })

    assert result.triggered is True
    assert result.matched_count == 1
    assert result.template_context["latency_ms"] == "6000"


@pytest.mark.asyncio
async def test_latency_high_not_triggered(evaluator):
    evaluator.client.search.return_value = _wrap_search_response([])

    result = await evaluator.evaluate({
        "condition": "latency_high",
        "monitor_filter": "*",
        "latency_threshold_ms": 5000,
    })

    assert result.triggered is False


# --- cert_expiring ---

@pytest.mark.asyncio
async def test_cert_expiring_triggered(evaluator):
    evaluator.client.search.return_value = _wrap_search_response([
        _make_heartbeat_hit("https-01", cert_not_after="2026-04-10T00:00:00Z"),
    ])

    result = await evaluator.evaluate({
        "condition": "cert_expiring",
        "monitor_filter": "*",
        "days_before": 30,
    })

    assert result.triggered is True
    assert result.matched_count == 1
    assert result.template_context["cert_subject"] == "*.https-01.com"


@pytest.mark.asyncio
async def test_cert_expiring_not_triggered(evaluator):
    evaluator.client.search.return_value = _wrap_search_response([])

    result = await evaluator.evaluate({
        "condition": "cert_expiring",
        "monitor_filter": "*",
        "days_before": 30,
    })

    assert result.triggered is False


# --- 엣지 케이스 ---

@pytest.mark.asyncio
async def test_unknown_condition_returns_false(evaluator):
    result = await evaluator.evaluate({"condition": "unknown_condition", "monitor_filter": "*"})
    assert result.triggered is False


@pytest.mark.asyncio
async def test_search_exception_returns_false(evaluator):
    evaluator.client.search.side_effect = Exception("Connection refused")

    result = await evaluator.evaluate({"condition": "status_down", "monitor_filter": "*"})

    assert result.triggered is False


# --- source type 메타데이터 ---

def test_source_type(evaluator):
    assert evaluator.get_source_type() == "healthcheck"


def test_conditions_list(evaluator):
    conditions = evaluator.get_conditions()
    assert len(conditions) == 3
    ids = [c["id"] for c in conditions]
    assert "status_down" in ids
    assert "latency_high" in ids
    assert "cert_expiring" in ids


# ============================================================
# AuthEvaluator 테스트
# ============================================================

@pytest.fixture
def auth_evaluator():
    ev = AuthEvaluator()
    ev._client = MagicMock()
    return ev


def _agg_response(buckets: list[dict]) -> dict:
    return {
        "hits": {"hits": [], "total": {"value": 0}},
        "aggregations": {"per_account": {"buckets": buckets}},
    }


def _user_hits(users: list[dict]) -> dict:
    return {
        "hits": {
            "total": {"value": len(users)},
            "hits": [{"_source": u} for u in users],
        },
    }


# --- login_fail_surge ---

@pytest.mark.asyncio
async def test_login_fail_surge_triggered(auth_evaluator):
    auth_evaluator.client.search.return_value = _agg_response([
        {"key": "attacker@test.com", "doc_count": 12},
        {"key": "user@test.com", "doc_count": 7},
    ])

    result = await auth_evaluator.evaluate({
        "condition": "login_fail_surge",
        "account_filter": "*",
        "fail_threshold": 5,
        "time_window_min": 10,
    })

    assert result.triggered is True
    assert result.matched_count == 2
    assert result.template_context["account"] == "attacker@test.com"
    assert result.template_context["fail_count"] == "12"
    assert result.template_context["account_count"] == "2"


@pytest.mark.asyncio
async def test_login_fail_surge_not_triggered(auth_evaluator):
    auth_evaluator.client.search.return_value = _agg_response([])

    result = await auth_evaluator.evaluate({
        "condition": "login_fail_surge",
        "account_filter": "*",
        "fail_threshold": 5,
        "time_window_min": 10,
    })

    assert result.triggered is False


# --- account_locked ---

@pytest.mark.asyncio
async def test_account_locked_triggered(auth_evaluator):
    auth_evaluator.client.search.return_value = _user_hits([
        {"id": "u1", "email": "locked@test.com", "name": "Locked User", "locked_until": "2026-03-24T12:00:00Z", "is_active": False},
    ])

    result = await auth_evaluator.evaluate({
        "condition": "account_locked",
        "account_filter": "*",
    })

    assert result.triggered is True
    assert result.matched_count == 1
    assert result.template_context["account"] == "locked@test.com"
    assert result.template_context["name"] == "Locked User"


@pytest.mark.asyncio
async def test_account_locked_not_triggered(auth_evaluator):
    auth_evaluator.client.search.return_value = _user_hits([])

    result = await auth_evaluator.evaluate({
        "condition": "account_locked",
        "account_filter": "*",
    })

    assert result.triggered is False


# --- 엣지 케이스 ---

@pytest.mark.asyncio
async def test_auth_unknown_condition(auth_evaluator):
    result = await auth_evaluator.evaluate({"condition": "unknown", "account_filter": "*"})
    assert result.triggered is False


@pytest.mark.asyncio
async def test_auth_search_exception(auth_evaluator):
    auth_evaluator.client.search.side_effect = Exception("Connection refused")
    result = await auth_evaluator.evaluate({"condition": "login_fail_surge", "account_filter": "*", "fail_threshold": 5, "time_window_min": 10})
    assert result.triggered is False


# --- 메타데이터 ---

def test_auth_source_type(auth_evaluator):
    assert auth_evaluator.get_source_type() == "auth"


def test_auth_conditions_list(auth_evaluator):
    conditions = auth_evaluator.get_conditions()
    assert len(conditions) == 2
    ids = [c["id"] for c in conditions]
    assert "login_fail_surge" in ids
    assert "account_locked" in ids
