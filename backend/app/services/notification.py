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
        - {{변수}} 형식 지원 (공백 허용)
        - {{nested.field}} 중첩 필드 접근 지원
        - 중첩 필드가 context에 없으면 모든 hits에서 자동 추출
        """

        def get_nested_value(obj: Any, keys: list) -> Any:
            """중첩 필드 값 추출 (점 표기법 및 flattened key 지원)"""
            if not obj:
                return None
            
            # 1. 일반적인 중첩 구조 탐색
            value = obj
            found_nested = True
            for k in keys:
                if isinstance(value, dict):
                    value = value.get(k)
                    if value is None:
                        found_nested = False
                        break
                else:
                    found_nested = False
                    break
            
            if found_nested:
                return value

            # 2. Flattened key 탐색 (예: {"endpoint.name": "host1"})
            full_key = ".".join(keys)
            if isinstance(obj, dict):
                return obj.get(full_key)
            
            return None

        def to_str(value: Any) -> str:
            if isinstance(value, (dict, list)):
                return json.dumps(value, ensure_ascii=False, indent=2)
            return str(value)

        def replace_var(match):
            # 공백 제거 후 키 추출
            key = match.group(1).strip()

            # 단순 키 접근 (total, rule_name 등)
            if '.' not in key:
                value = context.get(key)
                if value is None:
                    # hits._source에서도 찾아보기 (첫 번째 hit 기준)
                    hit_sources = context.get("_hit_sources", [])
                    if hit_sources and isinstance(hit_sources, list):
                        value = hit_sources[0].get(key)
                
                if value is not None:
                    return to_str(value)
                return f"{{{{{key}}}}}"

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
                    # 유니크한 값만 추출하여 병합
                    unique_values = list(dict.fromkeys(values))
                    return "\n".join(unique_values)

            return f"{{{{{key}}}}}"

        # 정규식: {{ 변수명 }} 형식 (앞뒤 공백 허용)
        return re.sub(r"\{\{\s*([\w\.@]+)\s*\}\}", replace_var, template)

    def _evaluate_trigger_condition(self, condition: str, context: Dict[str, Any], raise_errors: bool = False) -> bool:
        """
        트리거 조건 평가 (AST 기반 안전 평가)
        - 비교/논리 연산만 허용, 함수 호출·코드 실행 차단
        - 지원: >, >=, <, <=, ==, !=, and, or, not, 숫자, 문자열, True/False/None
        - 점 표기법(hits.total.value), 인덱스 접근(buckets[0]) 지원
        """
        if not condition or not condition.strip():
            return True

        try:
            import ast

            tree = ast.parse(condition, mode='eval')
            result = self._eval_node(tree.body, context)
            return bool(result)

        except Exception as e:
            if raise_errors:
                raise e
            logger.error(f"[트리거] 조건 평가 실패: '{condition}' - {e}")
            return True

    def _eval_node(self, node, context: Dict[str, Any]):
        """AST 노드를 재귀적으로 평가. 허용된 노드 타입만 처리."""
        import ast

        if isinstance(node, ast.Expression):
            return self._eval_node(node.body, context)

        # 리터럴: 숫자, 문자열, True, False, None
        if isinstance(node, ast.Constant):
            return node.value

        # 변수 참조: total, hits 등
        if isinstance(node, ast.Name):
            if node.id not in context:
                raise NameError(f"Unknown variable: '{node.id}'")
            val = context[node.id]
            return DotDict(val) if isinstance(val, dict) else val

        # 점 표기법: hits.total.value
        if isinstance(node, ast.Attribute):
            obj = self._eval_node(node.value, context)
            if isinstance(obj, dict):
                if node.attr not in obj:
                    raise AttributeError(f"'{node.attr}' not found")
                return obj[node.attr]
            if hasattr(obj, node.attr):
                return getattr(obj, node.attr)
            raise AttributeError(f"'{node.attr}' not found")

        # 인덱스 접근: buckets[0]
        if isinstance(node, ast.Subscript):
            obj = self._eval_node(node.value, context)
            idx = self._eval_node(node.slice, context)
            return obj[idx]

        # 비교: >, >=, <, <=, ==, !=
        if isinstance(node, ast.Compare):
            left = self._eval_node(node.left, context)
            ops_map = {
                ast.Gt: lambda a, b: a > b,
                ast.GtE: lambda a, b: a >= b,
                ast.Lt: lambda a, b: a < b,
                ast.LtE: lambda a, b: a <= b,
                ast.Eq: lambda a, b: a == b,
                ast.NotEq: lambda a, b: a != b,
                ast.In: lambda a, b: a in b,
                ast.NotIn: lambda a, b: a not in b,
            }
            for op, comparator in zip(node.ops, node.comparators):
                right = self._eval_node(comparator, context)
                op_func = ops_map.get(type(op))
                if op_func is None:
                    raise ValueError(f"Unsupported operator: {type(op).__name__}")
                if not op_func(left, right):
                    return False
                left = right
            return True

        # 논리 연산: and, or
        if isinstance(node, ast.BoolOp):
            if isinstance(node.op, ast.And):
                return all(self._eval_node(v, context) for v in node.values)
            if isinstance(node.op, ast.Or):
                return any(self._eval_node(v, context) for v in node.values)

        # 단항 연산: not, -
        if isinstance(node, ast.UnaryOp):
            operand = self._eval_node(node.operand, context)
            if isinstance(node.op, ast.Not):
                return not operand
            if isinstance(node.op, ast.USub):
                return -operand

        raise ValueError(f"Disallowed expression: {type(node).__name__}")

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
            default_payload = {
                "id": alert_id,
                "rule_name": created_alert.get("rule_name"),
                "rule_severity": created_alert.get("rule_severity"),
                "message": created_alert.get("message"),
                "created_at": created_alert.get("created_at"),
                "rule_target_index": created_alert.get("rule_target_index"),
            }
            webhook_payload = self._build_webhook_payload(
                receiver.get("webhook_body", ""), default_payload
            )
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

    def _build_webhook_payload(
        self, body_template: str, default_payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        커스텀 webhook body 템플릿이 있으면 변수 치환 후 JSON 파싱하여 반환.
        템플릿이 비어있거나 파싱 실패 시 기본 payload 반환.
        변수 값은 JSON 문자열 내부에서 안전하도록 이스케이프 처리.
        """
        if not body_template or not body_template.strip():
            return default_payload

        try:
            rendered = body_template
            for key, value in default_payload.items():
                safe_value = json.dumps(str(value) if value is not None else "", ensure_ascii=False)
                safe_value = safe_value[1:-1]
                rendered = rendered.replace("{{" + key + "}}", safe_value)
            rendered = re.sub(r"\{\{[^}]+\}\}", "", rendered)
            return json.loads(rendered)
        except (json.JSONDecodeError, Exception) as e:
            logger.warning(f"Webhook body 템플릿 파싱 실패, 기본 payload 사용: {e}")
            return default_payload

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
            "event_index": target_index,

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
