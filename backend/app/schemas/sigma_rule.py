from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict
from datetime import datetime


# --- Sigma Rule 경량 목록 응답 (raw_yaml, detection 미포함) ---

class SigmaRuleListItem(BaseModel):
    id: str
    sigma_id: str
    name: str
    level_normalized: str = "medium"
    status: str = "active"
    log_source_category: Optional[str] = None
    log_source_product: Optional[str] = None
    tags: List[str] = []
    mitre_technique_ids: List[str] = []
    mitre_tactic_ids: List[str] = []
    revision: int = 1
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# --- Sigma Rule 전체 상세 응답 ---

class SigmaRuleResponse(BaseModel):
    id: str
    sigma_id: str
    name: str
    description: Optional[str] = None
    level_original: Optional[str] = None
    level_normalized: str = "medium"
    sigma_status: Optional[str] = None
    author: Optional[str] = None
    sigma_date: Optional[str] = None
    references: List[str] = []
    license: Optional[str] = None
    log_source_category: Optional[str] = None
    log_source_product: Optional[str] = None
    log_source_service: Optional[str] = None
    detection_config: Dict[str, Any] = {}
    tags: List[str] = []
    mitre_technique_ids: List[str] = []
    mitre_tactic_ids: List[str] = []
    false_positives: List[str] = []
    status: str = "active"
    is_deleted: bool = False
    raw_yaml: Optional[str] = None
    file_path: Optional[str] = None
    content_hash: Optional[str] = None
    revision: int = 1
    deleted_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SigmaRuleListResponse(BaseModel):
    total: int
    items: List[SigmaRuleListItem]


# --- 토글 응답 ---

class SigmaRuleToggleResponse(BaseModel):
    id: str
    status: str
    updated_at: datetime


# --- 통계 응답 ---

class SigmaRuleStatsResponse(BaseModel):
    total: int
    by_severity: Dict[str, int] = {}
    by_status: Dict[str, int] = {}
    mitre_coverage: Dict[str, int] = {}


# --- Import Job ---

class ImportJobResponse(BaseModel):
    job_id: str
    status: str
    total_files: int = 0
    processed_files: int = 0
    inserted_count: int = 0
    updated_count: int = 0
    skipped_count: int = 0
    failed_count: int = 0
    conflict_count: int = 0
    error_message: Optional[str] = None
    errors: List[Dict[str, Any]] = []
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
