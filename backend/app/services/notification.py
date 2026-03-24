import json
import logging
import re
from datetime import datetime
from typing import List, Optional, Dict, Any

from app.core.websocket import manager
from app.repositories.notification import NotificationRepository
from app.schemas.notification import (
    NotificationRuleBase,
    NotificationRuleUpdate,
    validate_source_config,
)
from app.services.evaluators import EvaluatorRegistry
from app.services.webhook import send_webhook

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
        to_date: Optional[str] = None,
    ):
        return await self.repository.list_rules(
            skip=skip, limit=limit, sort_by=sort_by, order=order,
            query=query, severities=severities, is_active=is_active,
            from_date=from_date, to_date=to_date,
        )

    async def create_rule(self, rule_in: NotificationRuleBase, user_id: str = ""):
        data = rule_in.model_dump()
        data["source_config"] = validate_source_config(data["source_type"], data["source_config"])
        return await self.repository.create_rule(data, user_id=user_id)

    async def update_rule(self, rule_id: str, rule_in: NotificationRuleUpdate, user_id: str = ""):
        changed_fields = rule_in.changed_fields or []
        data = rule_in.model_dump(exclude_none=True, exclude={"changed_fields"})
        if "source_type" in data and "source_config" in data:
            data["source_config"] = validate_source_config(data["source_type"], data["source_config"])
        elif "source_config" in data:
            existing = await self.repository.get_rule_by_id(rule_id)
            if existing:
                st = data.get("source_type", existing.get("source_type", ""))
                data["source_config"] = validate_source_config(st, data["source_config"])
        return await self.repository.update_rule(rule_id, data, user_id=user_id, changed_fields=changed_fields)

    async def delete_rule(self, rule_id: str):
        return await self.repository.delete_rule(rule_id)

    # --- Preview & Source Types ---

    async def preview_rule(self, source_type: str, source_config: Dict[str, Any]) -> Dict[str, Any]:
        """규칙 저장 전 현재 조건을 즉시 평가"""
        validated = validate_source_config(source_type, source_config)
        evaluator = EvaluatorRegistry.get(source_type)
        if not evaluator:
            raise ValueError(f"지원하지 않는 소스 타입: {source_type}")
        result = await evaluator.evaluate(validated)
        msg_preview = None
        if result.triggered and result.details:
            first = result.details[0]
            msg_preview = f"{first.get('monitor_name', '')} — {source_config.get('condition', '')}"
        return {
            "would_trigger": result.triggered,
            "matched_count": result.matched_count,
            "details": result.details,
            "message_preview": msg_preview,
        }

    @staticmethod
    def get_source_types() -> list[Dict[str, Any]]:
        return EvaluatorRegistry.list_source_types()

    # --- Notification History ---

    async def list_notifications(
        self,
        skip: int = 0,
        limit: int = 100,
        query: Optional[str] = None,
        severities: Optional[List[str]] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        user_role: Optional[str] = None,
        sort_by: str = "created_at",
        order: str = "desc",
    ):
        return await self.repository.list_alerts(
            skip=skip, limit=limit, query=query, severities=severities,
            from_date=from_date, to_date=to_date, user_role=user_role,
            sort_by=sort_by, order=order,
        )

    # --- Detection Engine (스케줄러에서 호출) ---

    async def run_detection_for_rule(self, rule: Dict[str, Any]):
        """스케줄러가 호출하는 메인 진입점 — 메서드 시그니처 유지"""
        if not rule.get("is_active"):
            return None

        rule_id = rule["id"]
        source_type = rule.get("source_type", "")
        source_config = rule.get("source_config", {})
        now = datetime.utcnow()

        try:
            await self.repository.update_rule(rule_id, {"last_run_at": now.isoformat()})

            evaluator = EvaluatorRegistry.get(source_type)
            if not evaluator:
                logger.warning(f"[알림] 알 수 없는 소스 타입: {source_type} (규칙 {rule_id})")
                return None

            result = await evaluator.evaluate(source_config)
            if not result.triggered:
                return None

            # dedup 키: {rule_id}_{분 단위 시간 윈도우}
            time_window = now.replace(second=0, microsecond=0).isoformat()
            dedup_key = f"{rule_id}_{time_window}"
            existing = await self.repository.get_alert_by_dedup_key(dedup_key)
            if existing:
                return None

            # 메시지 템플릿 렌더링
            ctx = {**result.template_context, "rule_name": rule.get("name", ""), "severity": rule.get("severity", "")}
            message_template = rule.get("message_template", "알림이 발생했습니다.")
            rendered_message = self._render_message_template(message_template, ctx)

            # 알림 생성
            alert_data = {
                "rule_id": rule_id,
                "rule_name": rule.get("name", ""),
                "rule_description": rule.get("description"),
                "rule_severity": rule.get("severity", "info"),
                "source_type": source_type,
                "source_detail": result.details[0] if result.details else {},
                "message": rendered_message,
                "message_template": message_template,
                "dedup_key": dedup_key,
                "severity": rule.get("severity", "info"),
                "receiver": rule.get("receiver"),
                "status": "created",
                "created_at": now.isoformat(),
            }

            created_alert = await self.repository.create_alert(alert_data)
            await self._deliver_alert(created_alert, rule.get("receiver", {}))

            await self.repository.update_rule(rule_id, {
                "last_triggered_at": now.isoformat(),
                "total_alerts_count": rule.get("total_alerts_count", 0) + 1,
            })
            return created_alert

        except Exception as e:
            logger.error(f"규칙 {rule_id} 탐지 실행 오류: {e}")
            return None

    # --- 내부 유틸리티 ---

    def _render_message_template(self, template: str, context: Dict[str, Any]) -> str:
        """{{key}} 변수를 context 값으로 치환"""
        def replace_var(match):
            key = match.group(1).strip()
            value = context.get(key)
            if value is not None:
                return str(value)
            return f"{{{{{key}}}}}"
        return re.sub(r"\{\{\s*([\w\.]+)\s*\}\}", replace_var, template)

    async def _deliver_alert(self, created_alert: Dict[str, Any], receiver: Dict[str, Any]):
        """WebSocket + Webhook 전달"""
        alert_id = created_alert["id"]
        receiver_values = receiver.get("values", [])
        delivery_results: Dict[str, Any] = {}
        now = datetime.utcnow().isoformat()

        # WebSocket
        ws_result = {"status": "skipped", "sent_at": now, "targets": receiver_values, "error": None}
        try:
            ws_message = {
                "type": "new_alert",
                "data": {
                    "id": alert_id,
                    "rule_name": created_alert.get("rule_name"),
                    "message": created_alert.get("message"),
                    "severity": created_alert.get("severity"),
                    "rule_severity": created_alert.get("rule_severity"),
                    "created_at": created_alert.get("created_at"),
                },
            }
            if receiver_values:
                await manager.send_to_roles(roles=receiver_values, message=ws_message)
            else:
                await manager.broadcast(ws_message)
            ws_result["status"] = "success"
        except Exception as ws_error:
            ws_result["status"] = "failure"
            ws_result["error"] = str(ws_error)
            logger.error(f"WebSocket 알림 전송 실패: {ws_error}")
        delivery_results["websocket"] = ws_result

        # Webhook
        webhook_url = receiver.get("webhook_url")
        if webhook_url:
            webhook_headers = receiver.get("webhook_headers") or {}
            template_vars = {
                "id": alert_id,
                "rule_name": created_alert.get("rule_name"),
                "rule_severity": created_alert.get("rule_severity"),
                "message": created_alert.get("message"),
                "created_at": created_alert.get("created_at"),
                "source_type": created_alert.get("source_type", ""),
            }
            webhook_payload = self._build_webhook_payload(receiver.get("webhook_body", ""), template_vars)
            webhook_result = await send_webhook(webhook_url, webhook_payload, webhook_headers)
            delivery_results["webhook"] = webhook_result
        else:
            delivery_results["webhook"] = {"status": "skipped", "sent_at": now, "url": None, "error": "Webhook URL 미설정"}

        try:
            await self.repository.update_alert(alert_id, {"delivery_results": delivery_results})
        except Exception as e:
            logger.error(f"delivery_results 업데이트 실패 ({alert_id}): {e}")

    def _build_webhook_payload(self, body_template: str, template_vars: Dict[str, Any]) -> Dict[str, Any]:
        if not body_template or not body_template.strip():
            return {}
        try:
            rendered = body_template
            for key, value in template_vars.items():
                safe_value = json.dumps(str(value) if value is not None else "", ensure_ascii=False)
                safe_value = safe_value[1:-1]
                rendered = rendered.replace("{{" + key + "}}", safe_value)
            rendered = re.sub(r"\{\{[^}]+\}\}", "", rendered)
            return json.loads(rendered)
        except (json.JSONDecodeError, Exception) as e:
            logger.warning(f"Webhook body 템플릿 파싱 실패: {e}")
            return {}
