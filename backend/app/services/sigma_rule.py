import hashlib
import json
import logging
import re
from typing import Optional, List, Dict, Any

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
            mitre_technique_id=mitre_technique_id,
            rule_type=rule_type,
        )

    async def get_rule(self, rule_id: str):
        return await self.repository.get_rule_by_id(rule_id)

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
        """파싱된 Sigma YAML dict → OpenSearch 문서 형식으로 변환"""
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
        return doc

    def validate_sigma_yaml(self, parsed: Dict[str, Any]) -> Optional[str]:
        """필수 필드 검증. 실패 시 에러 메시지 반환, 성공 시 None"""
        if not parsed.get("title"):
            return "필수 필드 누락: title"
        if not parsed.get("logsource"):
            return "필수 필드 누락: logsource"
        if not parsed.get("detection"):
            return "필수 필드 누락: detection"
        return None
