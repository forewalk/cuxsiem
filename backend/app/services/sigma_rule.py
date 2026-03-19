import hashlib
import json
import logging
import re
from typing import Optional, List, Dict, Any

from app.core.field_mappings import (
    get_preset_mappings,
    get_preset_as_field_mapping_list,
    list_presets,
    DEFAULT_PRESET_ID,
)
from app.core.sigma_pipeline import SigmaPipelineManager
from app.repositories.sigma_rule import SigmaRuleRepository

logger = logging.getLogger(__name__)

SEVERITY_MAP = {
    "critical": "critical",
    "high": "high",
    "medium": "medium",
    "low": "low",
    "informational": "info",
}
DEFAULT_SEVERITY = "medium"

MITRE_TACTIC_PATTERN = re.compile(r"^attack\.([a-z_]+)$")
MITRE_TECHNIQUE_PATTERN = re.compile(r"^attack\.(t\d{4}(?:\.\d{3})?)$", re.IGNORECASE)


def normalize_severity(level: Optional[str]) -> tuple[str, str]:
    """Sigma level → (level_original, level_normalized)"""
    if not level:
        return ("", DEFAULT_SEVERITY)
    original = level.strip().lower()
    normalized = SEVERITY_MAP.get(original, DEFAULT_SEVERITY)
    return (original, normalized)


def extract_mitre_from_tags(tags: Optional[List[str]]) -> tuple[List[str], List[str]]:
    """Sigma tags → (mitre_technique_ids, mitre_tactic_ids)"""
    techniques = []
    tactics = []
    if not tags:
        return techniques, tactics
    for tag in tags:
        t = tag.strip().lower()
        tech_match = MITRE_TECHNIQUE_PATTERN.match(t)
        if tech_match:
            techniques.append(tech_match.group(1).upper())
            continue
        tactic_match = MITRE_TACTIC_PATTERN.match(t)
        if tactic_match:
            val = tactic_match.group(1)
            if val not in ("t" + "0" * 4,) and not val.startswith("t"):
                tactics.append(val)
    return techniques, tactics


def compute_content_hash(parsed_yaml: Dict[str, Any]) -> str:
    """YAML 내용을 정규화하여 SHA256 해시 생성"""
    normalized = json.dumps(parsed_yaml, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


class SigmaRuleService:
    def __init__(self):
        self.repository = SigmaRuleRepository()

    # --- CRUD ---

    async def list_rules(
        self,
        skip: int = 0,
        limit: int = 20,
        sort_by: str = "updated_at",
        order: str = "desc",
        search: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        log_source_product: Optional[str] = None,
        log_source_category: Optional[str] = None,
        log_source_service: Optional[str] = None,
        log_type_keywords: Optional[str] = None,
        mitre_technique_id: Optional[str] = None,
        rule_type: Optional[str] = None,
    ):
        return await self.repository.list_rules(
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            order=order,
            search=search,
            severity=severity,
            status=status,
            log_source_product=log_source_product,
            log_source_category=log_source_category,
            log_source_service=log_source_service,
            log_type_keywords=log_type_keywords,
            mitre_technique_id=mitre_technique_id,
            rule_type=rule_type,
        )

    async def get_filter_options(self, log_source_product: Optional[str] = None):
        return await self.repository.get_filter_options(log_source_product=log_source_product)

    async def get_logsource_options(self, product: Optional[str] = None, category: Optional[str] = None):
        return await self.repository.get_logsource_options(product=product, category=category)

    async def get_rule(self, rule_id: str):
        result = await self.repository.get_rule_by_id(rule_id)
        if not result:
            result = await self.repository.get_rule_by_sigma_id(rule_id)
        return result

    async def toggle_status(self, rule_id: str):
        return await self.repository.toggle_status(rule_id)

    async def delete_rule(self, rule_id: str, deleted_by: Optional[str] = None):
        return await self.repository.delete_rule(rule_id, deleted_by=deleted_by)

    async def get_stats(self):
        return await self.repository.get_stats()

    # --- Custom Rule CRUD ---

    async def create_custom_rule(self, data: Dict[str, Any]) -> Dict[str, Any]:
        rule_data = {
            "type": "custom",
            "name": data["name"],
            "description": data.get("description"),
            "level_original": data.get("level_normalized", DEFAULT_SEVERITY),
            "level_normalized": data.get("level_normalized", DEFAULT_SEVERITY),
            "detection_config": data.get("detection_config", {}),
            "log_source_category": data.get("log_source_category"),
            "log_source_product": data.get("log_source_product"),
            "log_source_service": data.get("log_source_service"),
            "mitre_technique_ids": data.get("mitre_technique_ids", []),
            "mitre_tactic_ids": data.get("mitre_tactic_ids", []),
            "false_positives": data.get("false_positives", []),
            "tags": [],
            "references": [],
            "status": "active",
        }
        if data.get("source_sigma_id"):
            rule_data["source_sigma_id"] = data["source_sigma_id"]
        if data.get("applied_field_mappings"):
            rule_data["applied_field_mappings"] = data["applied_field_mappings"]
        return await self.repository.create_rule(rule_data)

    async def update_custom_rule(self, rule_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        existing = await self.repository.get_rule_by_id(rule_id)
        if not existing or existing.get("type") != "custom":
            return None
        update_data = {k: v for k, v in data.items() if v is not None}
        if "level_normalized" in update_data:
            update_data["level_original"] = update_data["level_normalized"]
        return await self.repository.update_rule(rule_id, update_data)

    # --- Import 관련 유틸리티 ---

    def parse_sigma_yaml(self, parsed: Dict[str, Any], file_path: str, raw_yaml_str: str) -> Dict[str, Any]:
        """파싱된 Sigma YAML dict → OpenSearch 문서 형식으로 변환 (pySigma 변환 포함)"""
        level_original, level_normalized = normalize_severity(parsed.get("level"))
        tags = parsed.get("tags") or []
        mitre_techniques, mitre_tactics = extract_mitre_from_tags(tags)
        logsource = parsed.get("logsource") or {}

        doc = {
            "type": "sigma",
            "sigma_id": parsed.get("id", ""),
            "name": parsed.get("title", ""),
            "description": parsed.get("description"),
            "level_original": level_original,
            "level_normalized": level_normalized,
            "sigma_status": parsed.get("status"),
            "author": parsed.get("author"),
            "sigma_date": str(parsed.get("date", "")) if parsed.get("date") else None,
            "references": parsed.get("references") or [],
            "license": parsed.get("license"),
            "log_source_category": logsource.get("category"),
            "log_source_product": logsource.get("product"),
            "log_source_service": logsource.get("service"),
            "detection_config": parsed.get("detection") or {},
            "tags": tags,
            "mitre_technique_ids": mitre_techniques,
            "mitre_tactic_ids": mitre_tactics,
            "false_positives": parsed.get("falsepositives") or [],
            "raw_yaml": raw_yaml_str,
            "file_path": file_path,
            "content_hash": compute_content_hash(parsed),
        }

        conversion = self._convert_sigma_rule(raw_yaml_str)
        doc.update(conversion)

        return doc

    def _convert_sigma_rule(self, raw_yaml: str) -> Dict[str, Any]:
        """pySigma를 사용하여 Sigma YAML → OpenSearch DSL 변환"""
        try:
            manager = SigmaPipelineManager.get_instance()
            result = manager.convert_rule(raw_yaml)
            return result.to_dict()
        except Exception as e:
            logger.error("Sigma 변환 중 예외: %s", e)
            return {
                "opensearch_query": None,
                "query_conversion_status": "failed",
                "query_conversion_error": str(e)[:500],
                "query_pipeline_id": None,
                "query_converted_at": None,
            }

    # --- 재변환/통계 ---

    async def reconvert_single(self, rule_id: str) -> Optional[Dict[str, Any]]:
        """단건 재변환: 룰의 raw_yaml을 다시 pySigma로 변환"""
        rule = await self.repository.get_rule_by_id(rule_id)
        if not rule:
            return None
        if rule.get("type") == "custom":
            return {"id": rule_id, "query_conversion_status": "skipped", "error": "Custom rules do not use Sigma conversion"}

        raw_yaml = rule.get("raw_yaml")
        if not raw_yaml:
            return {"id": rule_id, "query_conversion_status": "failed", "error": "raw_yaml is missing"}

        conversion = self._convert_sigma_rule(raw_yaml)
        await self.repository.update_conversion_result(rule_id, conversion)
        return {"id": rule_id, **conversion}

    async def get_conversion_stats(self) -> Dict[str, int]:
        return await self.repository.get_conversion_stats()

    async def start_bulk_reconvert(self, filter_params: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """벌크 재변환 비동기 작업 시작"""
        active_job = await self.repository.get_active_reconvert_job()
        if active_job:
            return {"error": "conflict", "job_id": active_job["job_id"]}

        import uuid as _uuid
        from datetime import datetime, timezone
        job_id = f"reconvert-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
        job_data = {
            "job_id": job_id,
            "status": "started",
            "requested_count": 0,
            "processed_count": 0,
            "success_count": 0,
            "failed_count": 0,
            "skipped_count": 0,
            "pipeline_id": "default",
            "filter": filter_params,
            "error_samples": [],
            "started_at": datetime.now(timezone.utc).isoformat(),
        }
        await self.repository.create_reconvert_job(job_data)
        return {"job_id": job_id, "status": "started", "requested_count": 0}

    def validate_sigma_yaml(self, parsed: Dict[str, Any]) -> Optional[str]:
        """필수 필드 검증. 실패 시 에러 메시지 반환, 성공 시 None"""
        if not parsed.get("title"):
            return "필수 필드 누락: title"
        if not parsed.get("logsource"):
            return "필수 필드 누락: logsource"
        if not parsed.get("detection"):
            return "필수 필드 누락: detection"
        return None

    # --- 필드 매핑 프리셋 / 변환 미리보기 ---

    async def convert_preview(self, rule_id: str, preset_id: Optional[str] = None) -> Dict[str, Any]:
        """Sigma 규칙을 DSL로 변환 미리보기 + 적용된 필드 매핑 반환"""
        rule = await self.repository.get_rule_by_id(rule_id)
        if not rule:
            return {"rule_id": rule_id, "rule_name": "", "status": "failed", "error": "Rule not found"}

        pid = preset_id or DEFAULT_PRESET_ID
        preset_mappings = get_preset_mappings(pid)

        raw_yaml = rule.get("raw_yaml")
        opensearch_query = None
        conversion_status = "pending"
        error = None

        if raw_yaml:
            conversion = self._convert_sigma_rule(raw_yaml)
            opensearch_query = conversion.get("opensearch_query")
            conversion_status = conversion.get("query_conversion_status", "failed")
            error = conversion.get("query_conversion_error")
        elif rule.get("opensearch_query"):
            opensearch_query = rule["opensearch_query"]
            conversion_status = "success"

        detection_config = rule.get("detection_config", {})
        detection_fields = self._extract_fields_from_detection(detection_config)
        applied = [
            {"rule_field": f, "log_field": preset_mappings.get(f, "")}
            for f in detection_fields
        ]

        metadata = {
            "name": rule.get("name", ""),
            "description": rule.get("description"),
            "level_normalized": rule.get("level_normalized", "medium"),
            "log_source_category": rule.get("log_source_category"),
            "log_source_product": rule.get("log_source_product"),
            "log_source_service": rule.get("log_source_service"),
            "mitre_technique_ids": rule.get("mitre_technique_ids", []),
            "mitre_tactic_ids": rule.get("mitre_tactic_ids", []),
            "false_positives": rule.get("false_positives", []),
        }

        return {
            "rule_id": rule_id,
            "rule_name": rule.get("name", ""),
            "opensearch_query": opensearch_query,
            "status": conversion_status,
            "error": error,
            "applied_mappings": applied,
            "detection_config": detection_config,
            "metadata": metadata,
        }

    @staticmethod
    def _extract_fields_from_detection(detection_config: Dict[str, Any]) -> List[str]:
        """detection_config에서 사용되는 필드명을 추출 (Sigma detection 블록 파싱)"""
        fields: set[str] = set()
        for key, value in detection_config.items():
            if key in ("condition", "timeframe"):
                continue
            if isinstance(value, dict):
                for field_key in value:
                    clean = field_key.split("|")[0]
                    if clean:
                        fields.add(clean)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        for field_key in item:
                            clean = field_key.split("|")[0]
                            if clean:
                                fields.add(clean)
        return sorted(fields)

    async def get_index_fields(self, index_pattern: str) -> List[str]:
        """OpenSearch 인덱스의 필드 목록 조회"""
        from app.core.opensearch import get_opensearch
        client = get_opensearch()
        try:
            mapping = client.indices.get_mapping(index=index_pattern)
            fields: set[str] = set()
            for index_data in mapping.values():
                props = index_data.get("mappings", {}).get("properties", {})
                self._collect_field_paths(props, "", fields)
            return sorted(fields)
        except Exception as e:
            logger.warning("인덱스 필드 조회 실패 (%s): %s", index_pattern, e)
            return []

    @staticmethod
    def _collect_field_paths(props: Dict[str, Any], prefix: str, result: set[str]):
        """중첩 properties를 순회하며 dot-notation 필드 경로를 수집"""
        for name, meta in props.items():
            path = f"{prefix}{name}" if not prefix else f"{prefix}.{name}"
            result.add(path)
            if "properties" in meta:
                SigmaRuleService._collect_field_paths(meta["properties"], path, result)
