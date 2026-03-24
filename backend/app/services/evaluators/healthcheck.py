"""헬스체크 평가기 — Elastic Heartbeat 인덱스 기반 모니터 상태 감지"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

from app.core.opensearch import get_opensearch_client
from app.services.evaluators.base import BaseEvaluator, EvaluationResult

logger = logging.getLogger(__name__)

HEARTBEAT_INDEX = "heartbeat"


class HealthCheckEvaluator(BaseEvaluator):

    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = get_opensearch_client()
        return self._client

    def get_source_type(self) -> str:
        return "healthcheck"

    def get_display_name(self) -> str:
        return "헬스체크"

    def get_description(self) -> str:
        return "HTTP/TCP 모니터 상태 및 SSL 인증서 만료 감지"

    def get_conditions(self) -> list[dict[str, Any]]:
        return [
            {
                "id": "status_down",
                "name": "상태 DOWN",
                "fields": ["monitor_filter"],
            },
            {
                "id": "latency_high",
                "name": "레이턴시 초과",
                "fields": ["monitor_filter", "latency_threshold_ms"],
            },
            {
                "id": "cert_expiring",
                "name": "인증서 만료 임박",
                "fields": ["monitor_filter", "days_before"],
            },
        ]

    async def evaluate(self, source_config: dict[str, Any]) -> EvaluationResult:
        condition = source_config.get("condition", "status_down")
        monitor_filter = source_config.get("monitor_filter", "*")

        try:
            if condition == "status_down":
                return await self._evaluate_status_down(monitor_filter)
            elif condition == "latency_high":
                threshold = source_config.get("latency_threshold_ms", 5000)
                return await self._evaluate_latency_high(monitor_filter, threshold)
            elif condition == "cert_expiring":
                days = source_config.get("days_before", 30)
                return await self._evaluate_cert_expiring(monitor_filter, days)
            else:
                return EvaluationResult(triggered=False)
        except Exception as e:
            logger.error(f"[HealthCheckEvaluator] 평가 실패 ({condition}): {e}")
            return EvaluationResult(triggered=False)

    # --- 내부 구현 ---

    def _build_base_query(self, monitor_filter: str, extra_filters: list | None = None) -> dict:
        """collapse + sort 기반 공통 쿼리 빌더"""
        must = []
        if monitor_filter and monitor_filter != "*":
            must.append({"wildcard": {"monitor.name": {"value": monitor_filter, "case_insensitive": True}}})
        if extra_filters:
            must.extend(extra_filters)

        query = {"bool": {"must": must}} if must else {"match_all": {}}

        return {
            "query": query,
            "collapse": {"field": "monitor.id"},
            "sort": [{"@timestamp": {"order": "desc"}}],
            "size": 200,
            "_source": [
                "@timestamp", "monitor", "url",
                "tls.certificate_not_valid_after",
                "tls.server.x509.subject",
            ],
        }

    async def _search(self, body: dict) -> list[dict]:
        loop = asyncio.get_event_loop()

        def do_search():
            try:
                resp = self.client.search(index=HEARTBEAT_INDEX, body=body)
                return [h["_source"] for h in resp.get("hits", {}).get("hits", [])]
            except Exception as e:
                logger.warning(f"[HealthCheckEvaluator] heartbeat 검색 실패: {e}")
                return []

        return await loop.run_in_executor(None, do_search)

    async def _evaluate_status_down(self, monitor_filter: str) -> EvaluationResult:
        body = self._build_base_query(
            monitor_filter,
            extra_filters=[{"term": {"monitor.status": "down"}}],
        )
        hits = await self._search(body)

        if not hits:
            return EvaluationResult(triggered=False)

        details = [self._hit_to_detail(h) for h in hits]
        first = details[0]
        return EvaluationResult(
            triggered=True,
            matched_count=len(details),
            details=details,
            template_context={
                "monitor_name": first.get("monitor_name", ""),
                "monitor_count": str(len(details)),
                "status": "down",
                "url": first.get("url", ""),
                "rule_name": "",
                "severity": "",
            },
        )

    async def _evaluate_latency_high(self, monitor_filter: str, threshold_ms: int) -> EvaluationResult:
        threshold_us = threshold_ms * 1000
        body = self._build_base_query(
            monitor_filter,
            extra_filters=[{"range": {"monitor.duration.us": {"gt": threshold_us}}}],
        )
        hits = await self._search(body)

        if not hits:
            return EvaluationResult(triggered=False)

        details = [self._hit_to_detail(h) for h in hits]
        first = details[0]
        duration_us = first.get("duration_us", 0)
        return EvaluationResult(
            triggered=True,
            matched_count=len(details),
            details=details,
            template_context={
                "monitor_name": first.get("monitor_name", ""),
                "monitor_count": str(len(details)),
                "url": first.get("url", ""),
                "latency_ms": str(duration_us // 1000 if duration_us else 0),
                "rule_name": "",
                "severity": "",
            },
        )

    async def _evaluate_cert_expiring(self, monitor_filter: str, days_before: int) -> EvaluationResult:
        deadline = (datetime.now(timezone.utc) + timedelta(days=days_before)).isoformat()
        body = self._build_base_query(
            monitor_filter,
            extra_filters=[
                {"exists": {"field": "tls.certificate_not_valid_after"}},
                {"range": {"tls.certificate_not_valid_after": {"lte": deadline}}},
            ],
        )
        hits = await self._search(body)

        if not hits:
            return EvaluationResult(triggered=False)

        details = []
        for h in hits:
            d = self._hit_to_detail(h)
            tls = h.get("tls", {})
            x509 = tls.get("server", {}).get("x509", {})
            subject = x509.get("subject", {})
            cert_not_after = tls.get("certificate_not_valid_after", "")
            d["cert_subject"] = subject.get("common_name", "") if isinstance(subject, dict) else ""
            d["cert_expires"] = cert_not_after[:10] if cert_not_after else ""
            if cert_not_after:
                try:
                    exp = datetime.fromisoformat(cert_not_after.replace("Z", "+00:00"))
                    d["cert_days_left"] = str(max(0, (exp - datetime.now(timezone.utc)).days))
                except Exception:
                    d["cert_days_left"] = "?"
            details.append(d)

        first = details[0]
        return EvaluationResult(
            triggered=True,
            matched_count=len(details),
            details=details,
            template_context={
                "monitor_name": first.get("monitor_name", ""),
                "monitor_count": str(len(details)),
                "url": first.get("url", ""),
                "cert_subject": first.get("cert_subject", ""),
                "cert_days_left": first.get("cert_days_left", ""),
                "cert_expires": first.get("cert_expires", ""),
                "rule_name": "",
                "severity": "",
            },
        )

    @staticmethod
    def _hit_to_detail(src: dict) -> dict:
        """heartbeat 문서를 UI용 요약 dict로 변환"""
        monitor = src.get("monitor", {})
        url = src.get("url", {})
        return {
            "monitor_name": monitor.get("name", ""),
            "status": monitor.get("status", ""),
            "url": url.get("full", ""),
            "duration_us": monitor.get("duration", {}).get("us"),
            "timestamp": src.get("@timestamp", ""),
        }
