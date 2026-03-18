import ast
import asyncio
import json
import logging
import re
from datetime import datetime
from typing import Optional, List, Dict, Any

from app.repositories.detection_policy import DetectionPolicyRepository
from app.schemas.detection_policy import DetectionPolicyCreate, DetectionPolicyUpdate

logger = logging.getLogger(__name__)


class DotDict(dict):
    """점(.) 표기법으로 딕셔너리 필드에 접근할 수 있게 해주는 클래스."""
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


class DetectionPolicyService:
    def __init__(self):
        self.repository = DetectionPolicyRepository()

    # ── Policy CRUD ──────────────────────────────────────────────────────

    @staticmethod
    def _normalize_policy(doc: Dict[str, Any]) -> Dict[str, Any]:
        """구 스키마 필드명을 현재 스키마로 정규화한다."""
        # schedule_interval_min → interval_min
        if "interval_min" not in doc and "schedule_interval_min" in doc:
            doc["interval_min"] = doc["schedule_interval_min"]
        # target_indices (list) → target_index (str)
        if "target_index" not in doc and "target_indices" in doc:
            indices = doc["target_indices"]
            doc["target_index"] = indices[0] if indices else "logs-sentinel_one.edr"
        # condition_config 기본값
        if "condition_config" not in doc:
            doc["condition_config"] = {}
        return doc

    async def list_policies(
        self,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "created_at",
        order: str = "desc",
        query: Optional[str] = None,
        severity: Optional[str] = None,
        is_active: Optional[bool] = None,
    ):
        total, items = await self.repository.list_policies(
            skip=skip, limit=limit, sort_by=sort_by, order=order,
            query=query, severity=severity, is_active=is_active,
        )
        return total, [self._normalize_policy(doc) for doc in items]

    async def get_policy(self, policy_id: str):
        doc = await self.repository.get_policy_by_id(policy_id)
        if doc:
            return self._normalize_policy(doc)
        return None

    async def create_policy(self, policy_in: DetectionPolicyCreate, user_id: str = ""):
        return await self.repository.create_policy(policy_in.model_dump(), user_id=user_id)

    async def update_policy(self, policy_id: str, policy_in: DetectionPolicyUpdate):
        data = policy_in.model_dump(exclude_none=True)
        return await self.repository.update_policy(policy_id, data)

    async def delete_policy(self, policy_id: str):
        return await self.repository.delete_policy(policy_id)

    # ── Detection Event ──────────────────────────────────────────────────

    async def list_events(
        self,
        skip: int = 0,
        limit: int = 50,
        sort_by: str = "created_at",
        order: str = "desc",
        policy_id: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
    ):
        return await self.repository.list_events(
            skip=skip, limit=limit, sort_by=sort_by, order=order,
            policy_id=policy_id, severity=severity, status=status,
            from_date=from_date, to_date=to_date,
        )

    async def update_event_status(self, event_id: str, status: str):
        return await self.repository.update_event_status(event_id, status)

    # ── DSL 쿼리 테스트 ──────────────────────────────────────────────────

    async def test_query(self, target_index: str, condition_config: Dict[str, Any]) -> Dict[str, Any]:
        try:
            search_body = {**condition_config, "size": condition_config.get("size", 10)}
            if "sort" not in search_body:
                search_body["sort"] = [{"@timestamp": {"order": "desc"}}]

            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None,
                lambda: self.repository.client.search(index=target_index, body=search_body),
            )
        except Exception as e:
            raise Exception(f"Query execution failed: {e}")

    # ── 탐지 실행 엔진 (스케줄러에서 호출) ───────────────────────────────

    async def run_detection_for_policy(self, policy: Dict[str, Any]):
        """단일 탐지 정책에 대해 DSL 쿼리를 실행하고 이벤트를 생성한다."""
        if not policy.get("is_active"):
            return

        policy_id = policy["id"]
        target_index = policy.get("target_index", "logs-sentinel_one.edr")
        condition_config = policy.get("condition_config", {})
        now = datetime.utcnow()

        try:
            await self.repository.update_policy(policy_id, {"last_run_at": now.isoformat()})

            search_body = {**condition_config, "size": condition_config.get("size", 10)}
            if "sort" not in search_body:
                search_body["sort"] = [{"@timestamp": {"order": "desc"}}]

            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.repository.client.search(index=target_index, body=search_body),
            )

            total = result.get("hits", {}).get("total", {}).get("value", 0)
            hits = result.get("hits", {}).get("hits", [])

            trigger_condition = policy.get("trigger_condition")
            if trigger_condition:
                if not self._evaluate_trigger_condition(trigger_condition, DotDict(result)):
                    return None

            if total == 0:
                return None

            sample = [h.get("_source", h) for h in hits[:5]]
            message = self._render_message(
                policy.get("message_template", ""),
                {"total": total, "name": policy.get("name", ""), "severity": policy.get("severity", "")},
            )

            event_data = {
                "policy_id": policy_id,
                "policy_name": policy.get("name", ""),
                "severity": policy.get("severity", "medium"),
                "target_index": target_index,
                "matched_count": total,
                "sample_events": sample,
                "mitre_technique_ids": policy.get("mitre_technique_ids", []),
                "mitre_tactic_ids": policy.get("mitre_tactic_ids", []),
                "trigger_value": f"total={total}",
                "message": message,
                "status": "new",
            }
            created = await self.repository.create_event(event_data)

            await self.repository.update_policy(policy_id, {
                "last_triggered_at": now.isoformat(),
                "total_events_count": policy.get("total_events_count", 0) + 1,
            })
            return created

        except Exception as e:
            logger.error(f"정책 {policy_id} 탐지 실행 오류: {e}")
            return None

    # ── 트리거 조건 평가 (AST 기반) ──────────────────────────────────────

    def _evaluate_trigger_condition(self, condition: str, context: Dict[str, Any], raise_errors: bool = False) -> bool:
        if not condition or not condition.strip():
            return True
        try:
            tree = ast.parse(condition, mode="eval")
            return bool(self._eval_node(tree.body, context))
        except Exception as e:
            if raise_errors:
                raise e
            logger.error(f"[트리거] 조건 평가 실패: '{condition}' - {e}")
            return True

    def _eval_node(self, node, context: Dict[str, Any]):
        if isinstance(node, ast.Expression):
            return self._eval_node(node.body, context)
        if isinstance(node, ast.Constant):
            return node.value
        if isinstance(node, ast.Name):
            if node.id not in context:
                raise NameError(f"Unknown variable: '{node.id}'")
            val = context[node.id]
            return DotDict(val) if isinstance(val, dict) else val
        if isinstance(node, ast.Attribute):
            obj = self._eval_node(node.value, context)
            if isinstance(obj, dict):
                if node.attr not in obj:
                    raise AttributeError(f"'{node.attr}' not found")
                return obj[node.attr]
            if hasattr(obj, node.attr):
                return getattr(obj, node.attr)
            raise AttributeError(f"'{node.attr}' not found")
        if isinstance(node, ast.Subscript):
            obj = self._eval_node(node.value, context)
            idx = self._eval_node(node.slice, context)
            return obj[idx]
        if isinstance(node, ast.Compare):
            left = self._eval_node(node.left, context)
            ops_map = {
                ast.Gt: lambda a, b: a > b, ast.GtE: lambda a, b: a >= b,
                ast.Lt: lambda a, b: a < b, ast.LtE: lambda a, b: a <= b,
                ast.Eq: lambda a, b: a == b, ast.NotEq: lambda a, b: a != b,
                ast.In: lambda a, b: a in b, ast.NotIn: lambda a, b: a not in b,
            }
            for op, comparator in zip(node.ops, node.comparators):
                right = self._eval_node(comparator, context)
                fn = ops_map.get(type(op))
                if fn is None:
                    raise ValueError(f"Unsupported operator: {type(op).__name__}")
                if not fn(left, right):
                    return False
                left = right
            return True
        if isinstance(node, ast.BoolOp):
            if isinstance(node.op, ast.And):
                return all(self._eval_node(v, context) for v in node.values)
            if isinstance(node.op, ast.Or):
                return any(self._eval_node(v, context) for v in node.values)
        if isinstance(node, ast.UnaryOp):
            operand = self._eval_node(node.operand, context)
            if isinstance(node.op, ast.Not):
                return not operand
            if isinstance(node.op, ast.USub):
                return -operand
        raise ValueError(f"Disallowed expression: {type(node).__name__}")

    # ── 메시지 렌더링 ───────────────────────────────────────────────────

    @staticmethod
    def _render_message(template: str, context: Dict[str, Any]) -> str:
        if not template:
            return ""

        def replace_var(match):
            key = match.group(1).strip()
            val = context.get(key)
            if val is not None:
                return str(val) if not isinstance(val, (dict, list)) else json.dumps(val, ensure_ascii=False)
            return f"{{{{{key}}}}}"

        return re.sub(r"\{\{\s*([\w\.]+)\s*\}\}", replace_var, template)
