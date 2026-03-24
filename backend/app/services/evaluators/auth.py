"""사용자 인증 평가기 — 로그인 실패 급증 및 계정 잠금 감지"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

from app.core.opensearch import get_opensearch_client
from app.services.evaluators.base import BaseEvaluator, EvaluationResult

logger = logging.getLogger(__name__)

LOGIN_ATTEMPTS_INDEX = "cs_login_attempts"
USERS_INDEX = "cs_users"


class AuthEvaluator(BaseEvaluator):

    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = get_opensearch_client()
        return self._client

    def get_source_type(self) -> str:
        return "auth"

    def get_display_name(self) -> str:
        return "사용자 인증"

    def get_description(self) -> str:
        return "로그인 실패 급증 및 계정 잠금 감지"

    def get_conditions(self) -> list[dict[str, Any]]:
        return [
            {
                "id": "login_fail_surge",
                "name": "로그인 실패 급증",
                "fields": ["account_filter", "fail_threshold", "time_window_min"],
            },
            {
                "id": "account_locked",
                "name": "계정 잠금 발생",
                "fields": ["account_filter"],
            },
        ]

    async def evaluate(self, source_config: dict[str, Any]) -> EvaluationResult:
        condition = source_config.get("condition", "login_fail_surge")
        account_filter = source_config.get("account_filter", "*")

        try:
            if condition == "login_fail_surge":
                threshold = source_config.get("fail_threshold", 5)
                window_min = source_config.get("time_window_min", 10)
                return await self._evaluate_login_fail_surge(account_filter, threshold, window_min)
            elif condition == "account_locked":
                return await self._evaluate_account_locked(account_filter)
            else:
                return EvaluationResult(triggered=False)
        except Exception as e:
            logger.error(f"[AuthEvaluator] 평가 실패 ({condition}): {e}")
            return EvaluationResult(triggered=False)

    async def _search(self, index: str, body: dict) -> list[dict]:
        loop = asyncio.get_event_loop()

        def do_search():
            try:
                resp = self.client.search(index=index, body=body)
                return resp
            except Exception as e:
                logger.warning(f"[AuthEvaluator] {index} 검색 실패: {e}")
                return {"hits": {"hits": [], "total": {"value": 0}}, "aggregations": {}}

        return await loop.run_in_executor(None, do_search)

    async def _evaluate_login_fail_surge(
        self, account_filter: str, threshold: int, window_min: int
    ) -> EvaluationResult:
        """최근 N분 내 실패 횟수가 임계값을 초과한 계정을 찾는다."""
        since = (datetime.now(timezone.utc) - timedelta(minutes=window_min)).isoformat()

        must = [
            {"term": {"success": False}},
            {"range": {"attempted_at": {"gte": since}}},
        ]
        if account_filter and account_filter != "*":
            must.append({"wildcard": {"account": {"value": account_filter, "case_insensitive": True}}})

        body = {
            "size": 0,
            "query": {"bool": {"must": must}},
            "aggs": {
                "per_account": {
                    "terms": {"field": "account.keyword", "size": 200, "min_doc_count": threshold},
                }
            },
        }

        resp = await self._search(LOGIN_ATTEMPTS_INDEX, body)
        buckets = resp.get("aggregations", {}).get("per_account", {}).get("buckets", [])

        if not buckets:
            return EvaluationResult(triggered=False)

        details = []
        for b in buckets:
            details.append({
                "account": b["key"],
                "fail_count": b["doc_count"],
                "time_window_min": window_min,
            })

        first = details[0]
        return EvaluationResult(
            triggered=True,
            matched_count=len(details),
            details=details,
            template_context={
                "account": first["account"],
                "fail_count": str(first["fail_count"]),
                "account_count": str(len(details)),
                "time_window_min": str(window_min),
                "threshold": str(threshold),
                "rule_name": "",
                "severity": "",
            },
        )

    async def _evaluate_account_locked(self, account_filter: str) -> EvaluationResult:
        """현재 잠금 상태인 계정을 찾는다."""
        now = datetime.now(timezone.utc).isoformat()

        must = [
            {"term": {"is_active": False}},
            {"exists": {"field": "locked_until"}},
        ]
        if account_filter and account_filter != "*":
            must.append({"wildcard": {"email": {"value": account_filter, "case_insensitive": True}}})

        body = {
            "size": 200,
            "query": {"bool": {"must": must}},
            "_source": ["id", "email", "name", "locked_until", "is_active"],
        }

        resp = await self._search(USERS_INDEX, body)
        hits = resp.get("hits", {}).get("hits", [])

        if not hits:
            return EvaluationResult(triggered=False)

        details = []
        for h in hits:
            src = h["_source"]
            details.append({
                "account": src.get("email", ""),
                "name": src.get("name", ""),
                "locked_until": src.get("locked_until", ""),
            })

        first = details[0]
        return EvaluationResult(
            triggered=True,
            matched_count=len(details),
            details=details,
            template_context={
                "account": first["account"],
                "name": first.get("name", ""),
                "locked_until": first.get("locked_until", ""),
                "account_count": str(len(details)),
                "rule_name": "",
                "severity": "",
            },
        )
