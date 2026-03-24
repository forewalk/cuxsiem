from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


# --- Detection Rule 경량 목록 응답 ---

class SigmaRuleListItem(BaseModel):
    id: str
    type: str = "sigma"
    sigma_id: Optional[str] = None
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
    query_conversion_status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# --- Detection Rule 전체 상세 응답 ---

class SigmaRuleResponse(BaseModel):
    id: str
    type: str = "sigma"
    sigma_id: Optional[str] = None
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
    opensearch_query: Optional[Dict[str, Any]] = None
    query_conversion_status: Optional[str] = None
    query_conversion_error: Optional[str] = None
    query_pipeline_id: Optional[str] = None
    query_converted_at: Optional[str] = None
    source_sigma_id: Optional[str] = None
    applied_field_mappings: List[Dict[str, str]] = []

    model_config = ConfigDict(from_attributes=True)


# --- 변환 관련 응답 스키마 ---

class ConversionStatsResponse(BaseModel):
    total: int = 0
    success: int = 0
    failed: int = 0
    pending: int = 0
    skipped: int = 0
    not_converted: int = 0


class ReconvertJobResponse(BaseModel):
    job_id: str
    status: str
    requested_count: int


class ReconvertResultResponse(BaseModel):
    id: str
    query_conversion_status: str
    opensearch_query: Optional[Dict[str, Any]] = None
    query_pipeline_id: Optional[str] = None
    query_converted_at: Optional[str] = None
    query_conversion_error: Optional[str] = None


class BulkReconvertRequest(BaseModel):
    filter: Optional[Dict[str, str]] = None


# --- Custom Rule 생성/수정 ---

class CustomRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    detection_config: Dict[str, Any]
    level_normalized: str = Field(default="medium", description="critical/high/medium/low/info")
    log_source_category: Optional[str] = None
    log_source_product: Optional[str] = None
    log_source_service: Optional[str] = None
    mitre_technique_ids: List[str] = []
    mitre_tactic_ids: List[str] = []
    false_positives: List[str] = []
    source_sigma_id: Optional[str] = Field(default=None, description="원본 Sigma 규칙 ID (스탠다드 규칙 기반 생성 시)")
    applied_field_mappings: List[Dict[str, str]] = Field(default=[], description="적용된 필드 매핑 [{rule_field, log_field}]")


class CustomRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    detection_config: Optional[Dict[str, Any]] = None
    level_normalized: Optional[str] = None
    log_source_category: Optional[str] = None
    log_source_product: Optional[str] = None
    log_source_service: Optional[str] = None
    mitre_technique_ids: Optional[List[str]] = None
    mitre_tactic_ids: Optional[List[str]] = None
    false_positives: Optional[List[str]] = None


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


# --- 필터 옵션 ---

class FilterOptionsResponse(BaseModel):
    log_types: List[str] = []
    categories: List[str] = []
    severities: List[str] = []
    sources: List[str] = []


# --- Field Mapping Preset ---

class FieldMappingPresetItem(BaseModel):
    id: str
    name: str
    description: str = ""
    field_count: int = 0


class FieldMappingPresetListResponse(BaseModel):
    presets: List[FieldMappingPresetItem]


class FieldMappingPresetDetailResponse(BaseModel):
    id: str
    name: str
    description: str = ""
    mappings: Dict[str, str]


class ConvertPreviewRequest(BaseModel):
    rule_id: str
    preset_id: Optional[str] = None


class ConvertPreviewResponse(BaseModel):
    rule_id: str
    rule_name: str
    opensearch_query: Optional[Dict[str, Any]] = None
    status: str
    error: Optional[str] = None
    applied_mappings: List[Dict[str, str]] = []
    detection_config: Dict[str, Any] = {}
    metadata: Dict[str, Any] = {}
