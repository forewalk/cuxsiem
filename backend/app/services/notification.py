from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, timedelta
import httpx
import asyncio
import logging

from app.repositories.notification import NotificationRepository
from app.schemas.notification import NotificationRuleBase, NotificationRuleUpdate

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.repository = NotificationRepository()

    # --- Rule Management ---

    async def get_rule(self, rule_id: str):
        return await self.repository.get_rule_by_id(rule_id)

    async def list_rules(self, skip: int = 0, limit: int = 100, sort_by: str = "created_at", order: str = "desc"):
        return await self.repository.list_rules(skip, limit, sort_by, order)

    async def create_rule(self, rule_in: NotificationRuleBase):
        return await self.repository.create_rule(rule_in.model_dump())

    async def update_rule(self, rule_id: str, rule_in: NotificationRuleUpdate):
        return await self.repository.update_rule(rule_id, rule_in.model_dump(exclude_unset=True))

    async def delete_rule(self, rule_id: str):
        return await self.repository.delete_rule(rule_id)

    # --- Notification Management ---

    async def list_notifications(self, **kwargs):
        total, notifications = await self.repository.list_notifications(**kwargs)

        # 각 알림에 해당하는 규칙의 최신 severity 정보를 가져와서 병합
        rule_ids = list(set(n.get("rule_id") for n in notifications if n.get("rule_id")))
        rules_cache = {}
        for rid in rule_ids:
            rule = await self.get_rule(rid)
            if rule:
                rules_cache[rid] = rule.get("severity", "info")

        for n in notifications:
            n["severity"] = rules_cache.get(n.get("rule_id"), "info")

        return total, notifications

    async def run_detection_for_rule(self, rule: Dict[str, Any]):
        """특정 규칙에 대한 탐지 엔진 실행"""
        if not rule.get("is_active"):
            return

        rule_id = rule["id"]
        target_index = rule.get("target_index", "logs-sentinel_one.threats")
        condition_config = rule.get("condition_config", {})
        window_min = rule.get("window_min", 5)

        # 1. 쿼리 시간 범위 설정 (window_min)
        now = datetime.utcnow()
        start_time = (now - timedelta(minutes=window_min)).isoformat()

        # 2. Query DSL 구성
        # 룰에 정의된 DSL을 기반으로 시간 범위 필터 추가
        query = condition_config.get("query", {"match_all": {}})

        # SIEM 환경에서는 보통 @timestamp 또는 created_at을 기준으로 필터링
        # 여기서는 logs-sentinel_one.threats 인덱스의 표준 필터를 가정하거나 condition_config 내에 포함된 것으로 처리
        # (간단한 구현을 위해 룰의 DSL을 그대로 사용하되 필요시 엔진에서 래핑)

        search_body = {
            "query": query,
            "size": 10, # 에비던스용 샘플 데이터
            "sort": [{"created_at": {"order": "desc"}}]
        }

        # 3. OpenSearch 쿼리 실행
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.repository.client.search(index=target_index, body=search_body)
            )

            hits = result.get("hits", {}).get("hits", [])
            total = result.get("hits", {}).get("total", {}).get("value", 0)

            if total > 0:
                # 4. 탐지 성공 -> 알림 생성 (Dedup 로직은 추후 고도화)
                # 여기서는 가장 최근의 이벤트를 참조값으로 사용
                first_hit = hits[0]
                event_ref = first_hit.get("_id")

                notification_data = {
                    "rule_id": rule_id,
                    "title": f"[Alert] {rule['name']}",
                    "message": f"Detected {total} events in the last {window_min} minutes.",
                    "event_ref": event_ref,
                    "dedup_key": f"{rule_id}_{event_ref}", # 임시 dedup
                    "receiver": rule.get("receiver"),
                    "status": "created",
                    "created_at": now.isoformat()
                }

                created_notif = await self.repository.create_notification(notification_data)

                # 5. Webhook 발송 (비동기)
                asyncio.create_task(self.send_webhooks(rule.get("webhooks", []), created_notif))

                return created_notif
        except Exception as e:
            logger.error(f"Error running detection for rule {rule_id}: {e}")
            return None

    async def send_webhooks(self, urls: List[str], notification: Dict[str, Any]):
        """Webhook 발송 및 상태 업데이트"""
        if not urls:
            return

        async with httpx.AsyncClient() as client:
            for url in urls:
                try:
                    response = await client.post(url, json=notification, timeout=10.0)
                    if response.status_code < 300:
                        await self.repository.mark_as_sent(notification["id"], status="sent")
                    else:
                        await self.repository.mark_as_sent(
                            notification["id"],
                            status="failed",
                            error=f"HTTP {response.status_code}"
                        )
                except Exception as e:
                    await self.repository.mark_as_sent(
                        notification["id"],
                        status="failed",
                        error=str(e)
                    )

# NotificationRepository에 mark_as_sent 메서드가 빠져있어 추가가 필요함
