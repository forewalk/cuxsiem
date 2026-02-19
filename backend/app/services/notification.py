from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, timedelta
import asyncio
import logging
import re

from app.repositories.notification import NotificationRepository
from app.schemas.notification import NotificationRuleBase, NotificationRuleUpdate

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
        to_date: Optional[str] = None,
        user_role: Optional[str] = None
    ):
        """알림 내역 조회 (cs_alerts 인덱스에서 조회) - role 기반 필터링"""
        return await self.repository.list_alerts(
            skip=skip,
            limit=limit,
            query=query,
            from_date=from_date,
            to_date=to_date,
            user_role=user_role
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
    
    def _render_message_template(self, template: str, context: Dict[str, Any]) -> str:
        """
        메시지 템플릿 렌더링
        - {{변수}} 형식 지원
        - {{nested.field}} 중첩 필드 접근 지원
        """
        def replace_var(match):
            key = match.group(1)
            
            # 중첩 필드 접근 (예: agentDetectionInfo.accountName)
            if '.' in key:
                keys = key.split('.')
                value = context
                for k in keys:
                    if isinstance(value, dict):
                        value = value.get(k)
                        if value is None:
                            return f"{{{{{key}}}}}"  # 값이 없으면 원본 유지
                    else:
                        return f"{{{{{key}}}}}"
                return str(value) if value is not None else f"{{{{{key}}}}}"
            
            # 단순 키 접근
            value = context.get(key)
            if value is None:
                return f"{{{{{key}}}}}"
            return str(value)
        
        # 정규식: {{변수명}} 또는 {{nested.field.name}} 형식
        return re.sub(r"\{\{([\w\.@]+)\}\}", replace_var, template)

    async def run_detection_for_rule(self, rule: Dict[str, Any]):
        """특정 규칙에 대한 탐지 엔진 실행 및 알림 생성"""
        if not rule.get("is_active"):
            return

        rule_id = rule["id"]
        target_index = rule.get("target_index", "logs-sentinel_one.threats")
        condition_config = rule.get("condition_config", {})
        window_min = rule["window_min"]  # 필수 필드 (스키마에서 검증됨)

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

                # 첫 번째 히트를 기준으로 알림 생성
                first_hit = hits[0]
                event_ref = first_hit.get("_id")
                event_index = first_hit.get("_index")
                event_source = first_hit.get("_source", {})
                dedup_key = self._generate_dedup_key(rule, first_hit)

                # 메시지 템플릿 렌더링을 위한 context 구성
                # event_source의 모든 필드 + 메타 정보 포함
                template_context = {
                    # 기본 정보
                    "total": total,
                    "window_min": window_min,
                    "rule_name": rule.get("name"),
                    "rule_id": rule_id,
                    "rule_severity": rule.get("severity"),
                    "target_index": target_index,
                    "_id": event_ref,
                    "_index": event_index,
                    # event_source의 모든 필드 포함 (중첩 접근 지원)
                    **event_source
                }
                
                message_template = rule.get("message_template", "Detected {{total}} events in the last {{window_min}} minutes.")
                rendered_message = self._render_message_template(message_template, template_context)

                # cs_alerts 인덱스에 저장할 알림 데이터
                alert_data = {
                    "rule_id": rule_id,
                    
                    # 규칙 메타데이터
                    "rule_name": rule.get("name", "Unknown Rule"),
                    "rule_description": rule.get("description"),
                    "rule_severity": rule.get("severity", "info"),
                    "rule_target_index": target_index,
                    
                    # 메시지 관련
                    "message": rendered_message,
                    "message_template": message_template,
                    
                    # 이벤트 관련
                    "event_ref": event_ref,
                    "event_index": event_index,
                    "event_source": event_source,
                    
                    # 중복 제거 및 수신자
                    "dedup_key": dedup_key,
                    "severity": rule.get("severity", "info"),
                    "receiver": rule.get("receiver"),
                    
                    # 상태
                    "status": "created",
                    "created_at": now.isoformat()
                }

                created_alert = await self.repository.create_alert(alert_data)

                # 터미널에서 즉시 확인할 수 있도록 출력
                print(f"\n{'='*50}\n[ALERT DETECTED] {created_alert['rule_name']}\nMessage: {created_alert['message']}\nEvent: {event_index}/{event_ref}\n{'='*50}\n")

                await self.repository.update_rule(rule_id, {
                    "last_triggered_at": now.isoformat(),
                    "total_alerts_count": rule.get("total_alerts_count", 0) + total
                })

                return created_alert

            return None

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error running detection for rule {rule_id}: {error_msg}")
            await self.repository.update_rule(rule_id, {
                "last_error": error_msg,
                "error_count": rule.get("error_count", 0) + 1
            })
            return None

