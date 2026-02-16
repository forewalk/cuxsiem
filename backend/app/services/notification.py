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

    async def list_rules(
        self,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "created_at",
        order: str = "desc",
        query: Optional[str] = None,
        severities: Optional[List[str]] = None,
        is_active: Optional[bool] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ):
        return await self.repository.list_rules(
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            order=order,
            query=query,
            severities=severities,
            is_active=is_active,
            from_date=from_date,
            to_date=to_date
        )

    async def create_rule(self, rule_in: NotificationRuleBase):
        return await self.repository.create_rule(rule_in.model_dump())

    async def update_rule(self, rule_id: str, rule_in: NotificationRuleUpdate):
        return await self.repository.update_rule(rule_id, rule_in.model_dump(exclude_unset=True))

    async def delete_rule(self, rule_id: str):
        return await self.repository.delete_rule(rule_id)

    # --- Notification Management ---

    async def list_notifications(
        self,
        skip: int = 0,
        limit: int = 100,
        query: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ):
        """알림 로그 조회 (규칙 조회 없이 저장된 데이터 그대로 반환)"""
        return await self.repository.list_notifications(
            skip=skip,
            limit=limit,
            query=query,
            from_date=from_date,
            to_date=to_date
        )

    def _generate_dedup_key(self, rule: Dict[str, Any], event: Dict[str, Any]) -> str:
        # 매 실행마다 새로운 알림이 발생하도록 현재 시간(분 단위)을 키에 포함 (느슨한 설정)
        now_str = datetime.utcnow().strftime("%Y%m%d%H%M")
        template = rule.get("dedup_key_template", "{{rule_id}}")

        key = f"{now_str}_" + template.replace("{{rule_id}}", rule["id"])
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
        channels = rule.get("channels", {})

        now = datetime.utcnow()
        # 설정된 window_min을 정확히 따르되, 인덱싱 지연을 고려하여 10초의 미세 버퍼만 추가
        start_time = now - timedelta(minutes=window_min, seconds=10)

        # OpenSearch 쿼리 실행
        try:
            await self.repository.update_rule(rule_id, {"last_run_at": now.isoformat()})

            # 사용자 정의 쿼리가 없으면 match_all 사용
            original_query = condition_config.get("query", {"match_all": {}})

            # bool query 구조로 감싸서 시간 필터 적용
            final_query = {
                "bool": {
                    "must": [original_query],
                    "filter": [
                        {
                            "range": {
                                "@timestamp": {
                                    "gte": start_time.isoformat(),
                                    "lte": now.isoformat()
                                }
                            }
                        }
                    ]
                }
            }

            search_body = {
                "query": final_query,
                "size": 10,
                "sort": [{"@timestamp": {"order": "desc"}}]
            }

            logger.info(f"Running detection for rule '{rule['name']}' on index '{target_index}' (window: {window_min}m)")

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
                logger.info(f"Rule '{rule['name']}' triggered: {total} events found.")

                # 첫 번째 히트를 기준으로 알림 생성 (필요 시 모든 히트 처리 가능)
                first_hit = hits[0]
                event_ref = first_hit.get("_id")
                dedup_key = self._generate_dedup_key(rule, first_hit)

                notification_data = {
                    "rule_id": rule_id,
                    "title": rule.get("name", "Unknown Rule"),
                    "description": rule.get("description"),
                    "message": f"Detected {total} events in the last {window_min} minutes.",
                    "event_ref": event_ref,
                    "dedup_key": dedup_key,
                    "severity": rule.get("severity", "info"),
                    "receiver": rule.get("receiver"),
                    "status": "created",
                    "created_at": now.isoformat()
                }

                created_notif = await self.repository.create_notification(notification_data)

                # 터미널에서 즉시 확인할 수 있도록 출력
                print(f"\n{'='*50}\n[NOTIFICATION DETECTED] {created_notif['title']}\nMessage: {created_notif['message']}\n{'='*50}\n")

                await self.repository.update_rule(rule_id, {
                    "last_triggered_at": now.isoformat(),
                    "total_alerts_count": rule.get("total_alerts_count", 0) + total
                })

                # --- 다양한 발송 채널(Channels) 처리 ---
                tasks = []
                if channels.get("webhooks"):
                    tasks.append(self.send_webhooks(channels["webhooks"], created_notif))

                if tasks:
                    asyncio.create_task(asyncio.gather(*tasks))

                return created_notif

            return None

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

                # 전송 데이터 원본 (증적용)
                payload = notification.copy()

                # 마스킹 처리된 헤더 (보안상 민감 정보 제외)
                safe_headers = {k: ("*" * 8 if k.lower() in ["authorization", "token", "apikey", "secret"] else v)
                               for k, v in headers.items()}

                try:
                    response = await client.request(
                        method,
                        url,
                        json=payload,
                        headers=headers,
                        timeout=10.0
                    )

                    resp_body = ""
                    try:
                        resp_body = response.text[:1000] # 너무 크면 잘라서 저장
                    except:
                        pass

                    if response.status_code < 300:
                        await self.repository.mark_as_sent(
                            notification["id"],
                            status="sent",
                            channel="webhook",
                            endpoint=url,
                            request_headers=safe_headers,
                            outgoing_payload=payload,
                            response_status_code=response.status_code,
                            response_body=resp_body
                        )
                    else:
                        await self.repository.mark_as_sent(
                            notification["id"],
                            status="failed",
                            error=f"HTTP {response.status_code}",
                            channel="webhook",
                            endpoint=url,
                            request_headers=safe_headers,
                            outgoing_payload=payload,
                            response_status_code=response.status_code,
                            response_body=resp_body
                        )
                except Exception as e:
                    await self.repository.mark_as_sent(
                        notification["id"],
                        status="failed",
                        error=str(e),
                        channel="webhook",
                        endpoint=url,
                        request_headers=safe_headers,
                        outgoing_payload=payload
                    )
