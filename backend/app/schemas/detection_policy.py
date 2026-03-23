from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


# --- Field Mapping ---

class FieldMapping(BaseModel):
    rule_field: str
    log_field: str


# --- Change History ---

class ChangeHistoryEntry(BaseModel):
    user_id: str
    changed_at: datetime
    changed_fields: List[str] = []


# --- Detector (탐지 정책 = OpenSearch Detector 등가) ---

class DetectorCreate(BaseModel):
    name: str
    description: Optional[str] = None
    detector_type: str = Field(description="windows / network / linux / application / cloud / custom")
    target_indices: List[str] = Field(description="대상 인덱스 패턴 목록")
    linked_rule_ids: List[str] = Field(default=[], description="연결된 탐지 규칙 ID 목록")
    field_mappings: List[FieldMapping] = Field(default=[], description="소스필드→룰필드 매핑")
    schedule_interval_min: int = Field(ge=1, le=1440, description="실행 주기(분)")
    trigger_condition: Optional[str] = Field(
        default=None,
        description="트리거 조건식 (예: 'total > 0')",
    )
    message_template: str = Field(
        default="[{{severity}}] {{name}}: {{total}}건 탐지",
        description="이벤트 메시지 템플릿",
    )
    severity: str = "medium"
    is_active: bool = True
    timestamp_field: str = Field(default="@timestamp", description="시간 필터에 사용할 타임스탬프 필드명")
    max_search_window_min: int = Field(default=1440, ge=5, le=10080, description="최대 검색 윈도우(분), 기본 1440(24h)")
    webhook_url: Optional[str] = Field(default=None, description="Webhook URL")
    webhook_headers: Optional[Dict[str, str]] = Field(default=None, description="Webhook 커스텀 헤더")
    webhook_body: Optional[str] = Field(default=None, description="Webhook 본문 템플릿 (JSON). 미설정 시 기본 payload 전송")


class DetectorUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    detector_type: Optional[str] = None
    target_indices: Optional[List[str]] = None
    linked_rule_ids: Optional[List[str]] = None
    field_mappings: Optional[List[FieldMapping]] = None
    schedule_interval_min: Optional[int] = Field(None, ge=1)
    trigger_condition: Optional[str] = None
    message_template: Optional[str] = None
    severity: Optional[str] = None
    is_active: Optional[bool] = None
    timestamp_field: Optional[str] = None
    max_search_window_min: Optional[int] = Field(None, ge=5, le=10080)
    webhook_url: Optional[str] = None
    webhook_headers: Optional[Dict[str, str]] = None
    webhook_body: Optional[str] = None
    changed_fields: Optional[List[str]] = Field(None, exclude=True)


class DetectorResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    detector_type: str = ""
    target_indices: List[str] = []
    linked_rule_ids: List[str] = []
    field_mappings: List[FieldMapping] = []
    schedule_interval_min: int = 5
    trigger_condition: Optional[str] = None
    message_template: str = ""
    severity: str = "medium"
    is_active: bool = True
    last_run_at: Optional[datetime] = None
    last_triggered_at: Optional[datetime] = None
    total_findings_count: int = 0
    timestamp_field: str = "@timestamp"
    max_search_window_min: int = 1440
    webhook_url: Optional[str] = None
    webhook_headers: Optional[Dict[str, str]] = None
    webhook_body: Optional[str] = None
    change_history: List[ChangeHistoryEntry] = []
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DetectorListResponse(BaseModel):
    total: int
    items: List[DetectorResponse]


# --- Detection Finding (탐지 이벤트/결과) ---

class FindingResponse(BaseModel):
    id: str
    detector_id: str
    detector_name: str
    rule_id: Optional[str] = None
    rule_name: Optional[str] = None
    severity: str
    target_index: str
    matched_count: int = 0
    sample_events: List[Dict[str, Any]] = []
    mitre_technique_ids: List[str] = []
    mitre_tactic_ids: List[str] = []
    trigger_value: Optional[str] = None
    message: Optional[str] = None
    status: str = "new"
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class FindingListResponse(BaseModel):
    total: int
    items: List[FindingResponse]


class FindingStatusUpdate(BaseModel):
    status: str = Field(description="new / acknowledged / resolved / false_positive")


# --- Backward-compatible aliases ---
DetectionPolicyCreate = DetectorCreate
DetectionPolicyUpdate = DetectorUpdate
DetectionPolicyResponse = DetectorResponse
DetectionPolicyListResponse = DetectorListResponse
DetectionEventResponse = FindingResponse
DetectionEventListResponse = FindingListResponse
DetectionEventStatusUpdate = FindingStatusUpdate
