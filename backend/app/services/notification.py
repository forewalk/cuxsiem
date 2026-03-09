import asyncio
import json
import logging
import re
from datetime import datetime
from typing import List, Optional, Dict, Any

from app.core.websocket import manager
from app.repositories.notification import NotificationRepository
from app.schemas.notification import NotificationRuleBase, NotificationRuleUpdate
from app.services.webhook import send_webhook

logger = logging.getLogger(__name__)


class DotDict(dict):
    """
    점(.) 표기법으로 딕셔너리 필드에 접근할 수 있게 해주는 클래스.
    eval() 내에서 aggregations.threats.buckets[0].doc_count 와 같이 사용 가능하게 함.
    """
    def __getattr__(self, item):
        try:
            val = self[item]
            if isinstance(val, dict):
                return DotDict(val)
            if isinstance(val, list):
                return [DotDict(x) if isinstance(x, dict) else x for x in val]
            return val
        except KeyError:
            return None


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
        data = rule_in.model_dump(exclude_none=True)
        return await self.repository.update_rule(rule_id, data)

    async def delete_rule(self, rule_id: str):
        return await self.repository.delete_rule(rule_id)

    async def test_query(self, target_index: str, condition_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        DSL 쿼리를 실행하여 결과 반환 (테스트용)
        - 실제 알림 생성 없이 쿼리만 실행
        - OpenSearch 응답을 그대로 반환
        """
        try:
            # 쿼리 구성 (run_detection_for_rule과 동일한 로직)
            search_body = {
                **condition_config,
                "size": condition_config.get("size", 10000)
            }

            # sort가 없으면 @timestamp 내림차순 기본값 적용
            if "sort" not in search_body:
                search_body["sort"] = [{"@timestamp": {"order": "desc"}}]

            # OpenSearch 쿼리 실행
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.repository.client.search(index=target_index, body=search_body)
            )

            return result

        except Exception as e:
            logger.error(f"[쿼리 테스트] 실패: {e}")
            raise Exception(f"Query execution failed: {str(e)}")

    async def test_trigger(self, target_index: str, condition_config: Dict[str, Any], trigger_condition: str) -> Dict[str, Any]:
        """
        쿼리 실행 후 트리거 조건을 평가하여 결과 반환
        """
        try:
            # 1. 먼저 쿼리 실행
            result = await self.test_query(target_index, condition_config)
            
            # 2. 전체 응답을 DotDict로 래핑하여 점 표기법 접근 가능하게 함
            context = DotDict(result)
            
            evaluation = self._evaluate_trigger_condition(trigger_condition, context, raise_errors=True)
            
            total = result.get("hits", {}).get("total", {}).get("value", 0)
            aggregations = result.get("aggregations") or result.get("aggs") or {}
            return {
                "evaluation": evaluation,
                "total": total,
                "has_aggregations": bool(aggregations)
            }
        except Exception as e:
            # 구체적인 에러 메시지를 프론트엔드로 전달
            error_type = type(e).__name__
            raise Exception(f"[{error_type}] {str(e)}")

    # --- Notification Management ---

    async def list_notifications(
        self,
        skip: int = 0,
        limit: int = 100,
        query: Optional[str] = None,
        severities: Optional[List[str]] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        user_role: Optional[str] = None
    ):
        """알림 내역 조회 (cs_alerts 인덱스에서 조회) - role 기반 필터링"""
        return await self.repository.list_alerts(
            skip=skip,
            limit=limit,
            query=query,
            severities=severities,
            from_date=from_date,
            to_date=to_date,
            user_role=user_role
        )

    def _render_message_template(self, template: str, context: Dict[str, Any]) -> str:
        """
        메시지 템플릿 렌더링
        - {{변수}} 형식 지원
        - {{nested.field}} 중첩 필드 접근 지원
        - 중첩 필드가 context에 없으면 모든 hits에서 자동 추출
        """

        def get_nested_value(obj: Any, keys: list) -> Any:
            """중첩 필드 값 추출"""
            value = obj
            for k in keys:
                if isinstance(value, dict):
                    value = value.get(k)
                    if value is None:
                        return None
                else:
                    return None
            return value

        def to_str(value: Any) -> str:
            if isinstance(value, (dict, list)):
                return json.dumps(value, ensure_ascii=False, indent=2)
            return str(value)

        def replace_var(match):
            key = match.group(1)

            # 단순 키 접근 (total, rule_name 등)
            if '.' not in key:
                value = context.get(key)
                if value is None:
                    return f"{{{{{key}}}}}"
                return to_str(value)

            # 중첩 필드 접근
            keys = key.split('.')

            # 1차: context 전체에서 직접 탐색 (예: hits.total.value, aggregations.threats.buckets)
            ctx_value = get_nested_value(context, keys)
            if ctx_value is not None:
                return to_str(ctx_value)

            # 2차: hits._source 배열에서 추출 (예: threatInfo.threatName)
            hit_sources = context.get("_hit_sources", [])
            if hit_sources and isinstance(hit_sources, list):
                values = []
                for hit in hit_sources:
                    hit_value = get_nested_value(hit, keys)
                    if hit_value is not None:
                        values.append(to_str(hit_value))

                if values:
                    unique_values = list(dict.fromkeys(values))
                    return "\n".join(unique_values)

            return f"{{{{{key}}}}}"

        # 정규식: {{변수명}} 또는 {{nested.field.name}} 형식
        return re.sub(r"\{\{([\w\.@]+)\}\}", replace_var, template)

    def _evaluate_trigger_condition(self, condition: str, context: Dict[str, Any], raise_errors: bool = False) -> bool:
        """
        트리거 조건 평가
        - Python 표현식을 안전하게 평가
        - raise_errors: True일 경우 에러 발생 시 예외를 던짐 (테스트용)
        """
        if not condition or not condition.strip():
            return True

        try:
            # 1. 문법 검사 (보안 및 유효성 확인)
            import ast
            try:
                ast.parse(condition)
            except SyntaxError as e:
                if raise_errors:
                    raise Exception(f"Syntax error in condition: {e.msg}")
                return True

            # 2. 안전한 네임스페이스 설정
            import math
            safe_namespace = {
                '__builtins__': {},
                'math': math,
                'abs': abs,
                'min': min,
                'max': max,
                'sum': sum,
                'len': len,
            }
            for key, value in context.items():
                if isinstance(value, dict):
                    safe_namespace[key] = DotDict(value)
                elif isinstance(value, list):
                    safe_namespace[key] = [DotDict(x) if isinstance(x, dict) else x for x in value]
                else:
                    safe_namespace[key] = value

            # 3. 평가 실행
            # eval은 여전히 주의가 필요하지만, __builtins__를 비워 위험을 최소화함
            result = eval(condition, safe_namespace)
            return bool(result)

        except Exception as e:
            if raise_errors:
                # 구체적인 에러 메시지 전달 (예: NameError, AttributeError 등)
                raise e
            logger.error(f"[트리거] 조건 평가 실패: '{condition}' - {e}")
            return True

    async def _deliver_alert(self, created_alert: Dict[str, Any], receiver: Dict[str, Any]):
        """
        알림 전달: WebSocket + Webhook.
        채널별 발송 결과를 delivery_results에 기록하고 알림 문서를 업데이트한다.
        """
        alert_id = created_alert["id"]
        receiver_values = receiver.get("values", [])
        delivery_results: Dict[str, Any] = {}
        now = datetime.utcnow().isoformat()

        # 1. WebSocket 전송
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

        # 2. Webhook 전송
        webhook_url = receiver.get("webhook_url")
        if webhook_url:
            webhook_headers = receiver.get("webhook_headers") or {}
            webhook_payload = {
                "id": alert_id,
                "rule_name": created_alert.get("rule_name"),
                "rule_severity": created_alert.get("rule_severity"),
                "message": created_alert.get("message"),
                "created_at": created_alert.get("created_at"),
                "rule_target_index": created_alert.get("rule_target_index"),
            }
            webhook_result = await send_webhook(webhook_url, webhook_payload, webhook_headers)
            delivery_results["webhook"] = webhook_result
        else:
            delivery_results["webhook"] = {
                "status": "skipped",
                "sent_at": now,
                "url": None,
                "status_code": None,
                "error": "Webhook URL 미설정",
            }

        # 3. delivery_results를 알림 문서에 업데이트
        try:
            await self.repository.update_alert(alert_id, {"delivery_results": delivery_results})
        except Exception as e:
            logger.error(f"delivery_results 업데이트 실패 ({alert_id}): {e}")

    async def _create_aggregation_alert(
        self,
        rule: Dict[str, Any],
        result: Dict[str, Any],
        now: datetime,
        aggregations: Dict[str, Any],
        total: int
    ):
        """집계 결과 기반 알림 생성 (하나의 알림으로 통합)"""
        rule_id = rule["id"]
        target_index = rule.get("target_index", "logs-sentinel_one.edr")

        # 트리거 조건 체크
        trigger_condition = rule.get("trigger_condition")
        if trigger_condition:
            if not self._evaluate_trigger_condition(trigger_condition, DotDict(result)):
                return None

        # 중복 제거 키: 규칙 ID + 시간 윈도우 (분 단위로 동일 규칙은 하나의 알림만)
        time_window = now.replace(second=0, microsecond=0).isoformat()
        dedup_key = f"{rule_id}_{time_window}"

        # 중복 체크
        existing_alert = await self.repository.get_alert_by_dedup_key(dedup_key)
        if existing_alert:
            return None

        # 쿼리 결과 문서들 추출
        hits = result.get("hits", {}).get("hits", [])
        hit_sources = [hit.get("_source", {}) for hit in hits]

        # 메시지 템플릿 렌더링을 위한 context 구성 (OpenSearch 응답 전체 + 메타 정보)
        template_context = {
            **result,
            "total": total,
            "rule_name": rule.get("name"),
            "rule_id": rule_id,
            "rule_severity": rule.get("severity"),
            "target_index": target_index,
            "_hit_sources": hit_sources,
        }

        message_template = rule.get("message_template", "[WARNING] 총 {{total}}건의 이벤트가 탐지되었습니다.")
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

            # 집계 알림 특성
            "event_ref": f"aggregation_{rule_id}",
            "event_index": target_index,
            "event_source": {
                "type": "aggregation",
                "total": total,
                "aggregations": aggregations,
                "hits": hit_sources[:10]
            },

            # 중복 제거 및 수신자
            "dedup_key": dedup_key,
            "severity": rule.get("severity", "info"),
            "receiver": rule.get("receiver"),

            # 상태
            "status": "created",
            "created_at": now.isoformat()
        }

        created_alert = await self.repository.create_alert(alert_data)

        # WebSocket + Webhook 전달 및 delivery_results 기록
        await self._deliver_alert(created_alert, rule.get("receiver", {}))

        return created_alert

    async def run_detection_for_rule(self, rule: Dict[str, Any]):
        """특정 규칙에 대한 탐지 엔진 실행 및 알림 생성"""
        if not rule.get("is_active"):
            return

        rule_id = rule["id"]
        target_index = rule.get("target_index", "logs-sentinel_one.edr")
        condition_config = rule.get("condition_config", {})

        now = datetime.utcnow()

        # OpenSearch 쿼리 실행
        try:
            await self.repository.update_rule(rule_id, {"last_run_at": now.isoformat()})

            # 사용자 정의 쿼리를 그대로 사용 (시간 필터는 사용자가 DSL에 직접 포함해야 함)
            search_body = {
                **condition_config,
                "size": condition_config.get("size", 10)  # 기본값 10유지하되 쿼리에 있으면 따름
            }

            # sort가 없으면 @timestamp 내림차순 기본값 적용
            if "sort" not in search_body:
                search_body["sort"] = [{"@timestamp": {"order": "desc"}}]

            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.repository.client.search(index=target_index, body=search_body)
            )

            hits = result.get("hits", {}).get("hits", [])
            total = result.get("hits", {}).get("total", {}).get("value", 0)
            aggregations = result.get("aggregations") or result.get("aggs") or {}

            # 트리거 조건 체크 (공통)
            trigger_condition = rule.get("trigger_condition")
            if trigger_condition:
                if not self._evaluate_trigger_condition(trigger_condition, DotDict(result)):
                    return None

            if total == 0:
                return None

            created_alert = await self._create_aggregation_alert(rule, result, now, aggregations, total)

            if created_alert:
                await self.repository.update_rule(rule_id, {
                    "last_triggered_at": now.isoformat(),
                    "total_alerts_count": rule.get("total_alerts_count", 0) + 1
                })
                return created_alert
            return None

        except Exception as e:
            logger.error(f"규칙 {rule_id} 탐지 실행 오류: {e}")
            return None
