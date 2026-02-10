from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, timedelta
import httpx
import asyncio
import logging
import re

from app.repositories.notification import NotificationRepository
from app.schemas.notification import NotificationRuleBase, NotificationRuleUpdate, WebhookConfig

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

        rule_ids = list(set(n.get("rule_id") for n in notifications if n.get("rule_id")))
        rules_cache = {}
        for rid in rule_ids:
            rule = await self.get_rule(rid)
            if rule:
                rules_cache[rid] = rule.get("severity", "info")

        for n in notifications:
            n["severity"] = rules_cache.get(n.get("rule_id"), "info")

        return total, notifications

    def _generate_dedup_key(self, rule: Dict[str, Any], event: Dict[str, Any]) -> str:
        template = rule.get("dedup_key_template", "{{rule_id}}")
        
        key = template.replace("{{rule_id}}", rule["id"])
        key = key.replace("{{rule_name}}", rule.get("name", ""))
        
        matches = re.findall(r"\{\{([^}]+)\}\}", key)
        source = event.get("_source", {})
        
        for field in matches:
            if field in ["rule_id", "rule_name"]: continue
            val = str(source.get(field, "unknown"))
            key = key.replace(f"{{{{{field}}}}}", val)
            
        return key

    async def run_detection_for_rule(self, rule: Dict[str, Any]):
        """특정 규칙에 대한 탐지 엔진 실행 및 채널(Channels) 발송 수행"""
        if not rule.get("is_active"):
            return

        rule_id = rule["id"]
        target_index = rule.get("target_index", "logs-sentinel_one.threats")
        condition_config = rule.get("condition_config", {})
        window_min = rule.get("window_min", 5)
        channels = rule.get("channels", {}) # activities -> channels 변경

        now = datetime.utcnow()
        
        # OpenSearch 쿼리 실행
        try:
            await self.repository.update_rule(rule_id, {"last_run_at": now.isoformat()})

            query = condition_config.get("query", {"match_all": {}})
            search_body = {
                "query": query,
                "size": 10,
                "sort": [{"created_at": {"order": "desc"}}]
            }

            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.repository.client.search(index=target_index, body=search_body)
            )

            hits = result.get("hits", {}).get("hits", [])
            total = result.get("hits", {}).get("total", {}).get("value", 0)

            await self.repository.update_rule(rule_id, {
                "last_success_at": now.isoformat(),
                "error_count": 0,
                "last_error": None
            })

            if total > 0:
                first_hit = hits[0]
                event_ref = first_hit.get("_id")
                dedup_key = self._generate_dedup_key(rule, first_hit)

                notification_data = {
                    "rule_id": rule_id,
                    "title": f"[Alert] {rule['name']}",
                    "message": f"Detected {total} events in the last {window_min} minutes.",
                    "event_ref": event_ref,
                    "dedup_key": dedup_key,
                    "receiver": rule.get("receiver"),
                    "status": "created",
                    "created_at": now.isoformat()
                }

                created_notif = await self.repository.create_notification(notification_data)

                await self.repository.update_rule(rule_id, {
                    "last_triggered_at": now.isoformat(),
                    "total_alerts_count": rule.get("total_alerts_count", 0) + 1
                })

                # --- 다양한 발송 채널(Channels) 처리 ---
                tasks = []
                
                # Webhooks
                if channels.get("webhooks"):
                    tasks.append(self.send_webhooks(channels["webhooks"], created_notif))
                
                # Slack 
                if channels.get("slack"):
                    logger.info(f"Slack notification triggered for rule {rule_id}")
                    
                # Email
                if channels.get("email"):
                    logger.info(f"Email notification triggered for rule {rule_id}")

                if tasks:
                    asyncio.gather(*tasks)

                return created_notif
                
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error running detection for rule {rule_id}: {error_msg}")
            await self.repository.update_rule(rule_id, {
                "last_error": error_msg,
                "error_count": rule.get("error_count", 0) + 1
            })
            return None

    async def send_webhooks(self, configs: List[Dict[str, Any]], notification: Dict[str, Any]):
        async with httpx.AsyncClient() as client:
            for cfg in configs:
                url = cfg.get("url")
                method = cfg.get("method", "POST")
                headers = cfg.get("headers", {})
                
                try:
                    response = await client.request(
                        method, 
                        url, 
                        json=notification, 
                        headers=headers, 
                        timeout=10.0
                    )
                    
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
