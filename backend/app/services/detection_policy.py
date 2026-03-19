import ast
import asyncio
import json
import logging
import re
from datetime import datetime
from typing import Optional, List, Dict, Any

from app.repositories.detection_policy import DetectionPolicyRepository
from app.repositories.sigma_rule import SigmaRuleRepository
from app.schemas.detection_policy import DetectorCreate, DetectorUpdate

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
        self.rule_repository = SigmaRuleRepository()

    # ── Detector CRUD ─────────────────────────────────────────────────────

    @staticmethod
    def _normalize_detector(doc: Dict[str, Any]) -> Dict[str, Any]:
        """구 스키마 필드명을 현재 스키마로 정규화한다."""
        if "interval_min" not in doc and "schedule_interval_min" in doc:
            doc["interval_min"] = doc["schedule_interval_min"]
        if "target_index" not in doc and "target_indices" in doc:
            indices = doc["target_indices"]
            doc["target_index"] = indices[0] if indices else "logs-sentinel_one.edr"
        if "condition_config" not in doc:
            doc["condition_config"] = {}
        return doc

    async def list_detectors(
        self,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "created_at",
        order: str = "desc",
        query: Optional[str] = None,
        severity: Optional[str] = None,
        is_active: Optional[bool] = None,
        detector_type: Optional[str] = None,
    ):
        total, items = await self.repository.list_detectors(
            skip=skip, limit=limit, sort_by=sort_by, order=order,
            query=query, severity=severity, is_active=is_active,
            detector_type=detector_type,
        )
        return total, [self._normalize_detector(doc) for doc in items]

    async def get_detector(self, detector_id: str):
        doc = await self.repository.get_detector_by_id(detector_id)
        if doc:
            return self._normalize_detector(doc)
        return None

    async def create_detector(self, detector_in: DetectorCreate, user_id: str = ""):
        data = detector_in.model_dump()
        data["field_mappings"] = [fm.model_dump() if hasattr(fm, "model_dump") else fm for fm in (detector_in.field_mappings or [])]
        return await self.repository.create_detector(data, user_id=user_id)

    async def update_detector(self, detector_id: str, detector_in: DetectorUpdate):
        data = detector_in.model_dump(exclude_none=True)
        if "field_mappings" in data and data["field_mappings"] is not None:
            data["field_mappings"] = [
                fm.model_dump() if hasattr(fm, "model_dump") else fm
                for fm in data["field_mappings"]
            ]
        return await self.repository.update_detector(detector_id, data)

    async def delete_detector(self, detector_id: str):
        return await self.repository.delete_detector(detector_id)

    # ── Finding (탐지 결과) ───────────────────────────────────────────────

    async def list_findings(
        self,
        skip: int = 0,
        limit: int = 50,
        sort_by: str = "created_at",
        order: str = "desc",
        detector_id: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
    ):
        return await self.repository.list_findings(
            skip=skip, limit=limit, sort_by=sort_by, order=order,
            detector_id=detector_id, severity=severity, status=status,
            from_date=from_date, to_date=to_date,
        )

    async def update_finding_status(self, finding_id: str, status: str):
        return await self.repository.update_finding_status(finding_id, status)

    # ── DSL 쿼리 테스트 ──────────────────────────────────────────────────

    async def test_query(self, target_index: str, query_body: Dict[str, Any]) -> Dict[str, Any]:
        try:
            search_body = {**query_body, "size": query_body.get("size", 10)}
            if "sort" not in search_body:
                search_body["sort"] = [{"@timestamp": {"order": "desc"}}]

            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None,
                lambda: self.repository.client.search(index=target_index, body=search_body),
            )
        except Exception as e:
            raise Exception(f"Query execution failed: {e}")

    # ── 탐지 실행 엔진 (Detector → N개 룰 실행) ──────────────────────────

    async def run_detection_for_detector(self, detector: Dict[str, Any]):
        """Detector에 연결된 룰들을 순회하며 각 룰의 detection_config를 실행한다."""
        if not detector.get("is_active"):
            return

        detector_id = detector["id"]
        target_indices = detector.get("target_indices", [])
        field_mappings = detector.get("field_mappings", [])
        linked_rule_ids = detector.get("linked_rule_ids", [])
        now = datetime.utcnow()

        try:
            await self.repository.update_detector(detector_id, {"last_run_at": now.isoformat()})

            if not linked_rule_ids:
                return None

            rules = await self._fetch_rules(linked_rule_ids)
            if not rules:
                return None

            findings = []
            for rule in rules:
                finding = await self._run_rule_against_indices(
                    detector=detector,
                    rule=rule,
                    target_indices=target_indices,
                    field_mappings=field_mappings,
                )
                if finding:
                    findings.append(finding)

            if findings:
                await self.repository.update_detector(detector_id, {
                    "last_triggered_at": now.isoformat(),
                    "total_findings_count": detector.get("total_findings_count", 0) + len(findings),
                })

            return findings if findings else None

        except Exception as e:
            logger.error(f"Detector {detector_id} 탐지 실행 오류: {e}")
            return None

    async def _fetch_rules(self, rule_ids: List[str]) -> List[Dict[str, Any]]:
        rules = []
        for rule_id in rule_ids:
            rule = await self.rule_repository.get_rule_by_id(rule_id)
            if rule and rule.get("status") == "active":
                rules.append(rule)
        return rules


    async def _run_rule_against_indices(
        self,
        detector: Dict[str, Any],
        rule: Dict[str, Any],
        target_indices: List[str],
        field_mappings: List[Dict[str, str]],
    ) -> Optional[Dict[str, Any]]:
        detection_config = rule.get("detection_config", {})
        if not detection_config:
            return None

        search_body = self._apply_field_mappings(detection_config, field_mappings)
        search_body = {**search_body, "size": search_body.get("size", 10)}
        if "sort" not in search_body:
            search_body["sort"] = [{"@timestamp": {"order": "desc"}}]

        index_pattern = ",".join(target_indices) if target_indices else "logs-*"

        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.repository.client.search(index=index_pattern, body=search_body),
            )

            total = result.get("hits", {}).get("total", {}).get("value", 0)
            hits = result.get("hits", {}).get("hits", [])

            trigger_condition = detector.get("trigger_condition")
            if trigger_condition:
                if not self._evaluate_trigger_condition(trigger_condition, DotDict(result)):
                    return None

            if total == 0:
                return None

            sample = [h.get("_source", h) for h in hits[:5]]
            message = self._render_message(
                detector.get("message_template", ""),
                {
                    "total": total,
                    "name": detector.get("name", ""),
                    "severity": detector.get("severity", ""),
                    "rule_name": rule.get("name", ""),
                },
            )

            finding_data = {
                "detector_id": detector["id"],
                "detector_name": detector.get("name", ""),
                "rule_id": rule.get("id"),
                "rule_name": rule.get("name", ""),
                "severity": detector.get("severity", "medium"),
                "target_index": index_pattern,
                "matched_count": total,
                "sample_events": sample,
                "mitre_technique_ids": rule.get("mitre_technique_ids", []),
                "mitre_tactic_ids": rule.get("mitre_tactic_ids", []),
                "trigger_value": f"total={total}",
                "message": message,
                "status": "new",
            }
            return await self.repository.create_finding(finding_data)

        except Exception as e:
            logger.error(f"룰 {rule.get('id')} 실행 오류 (detector={detector['id']}): {e}")
            return None

    @staticmethod
    def _apply_field_mappings(detection_config: Dict[str, Any], field_mappings: List[Dict[str, str]]) -> Dict[str, Any]:
        """field_mappings를 적용하여 detection_config의 필드명을 변환한다."""
        if not field_mappings:
            return detection_config

        mapping_dict = {fm["rule_field"]: fm["log_field"] for fm in field_mappings}
        config_str = json.dumps(detection_config, ensure_ascii=False)
        for rule_field, log_field in mapping_dict.items():
            config_str = config_str.replace(f'"{rule_field}"', f'"{log_field}"')
        try:
            return json.loads(config_str)
        except json.JSONDecodeError:
            return detection_config

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

    # ── Backward-compatible aliases ───────────────────────────────────────

    async def list_policies(self, **kwargs):
        return await self.list_detectors(**kwargs)

    async def get_policy(self, policy_id: str):
        return await self.get_detector(policy_id)

    async def create_policy(self, policy_in, user_id: str = ""):
        return await self.create_detector(policy_in, user_id)

    async def update_policy(self, policy_id: str, policy_in):
        return await self.update_detector(policy_id, policy_in)

    async def delete_policy(self, policy_id: str):
        return await self.delete_detector(policy_id)

    async def list_events(self, **kwargs):
        return await self.list_findings(**kwargs)

    async def update_event_status(self, event_id: str, status: str):
        return await self.update_finding_status(event_id, status)

    async def run_detection_for_policy(self, policy: Dict[str, Any]):
        return await self.run_detection_for_detector(policy)
