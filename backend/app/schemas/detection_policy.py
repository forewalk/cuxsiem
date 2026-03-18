from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


# --- Detection Policy (탐지 정책) ---

class DetectionPolicyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    target_index: str = "logs-sentinel_one.edr"
    condition_config: Dict[str, Any]
    trigger_condition: Optional[str] = Field(
        default=None,
        description="트리거 조건식 (예: 'total > 0')",
    )
    message_template: str = Field(
        default="[{{severity}}] {{name}}: {{total}}건 탐지",
        description="이벤트 메시지 템플릿",
    )
    severity: str = "medium"
    interval_min: int = Field(ge=1, le=1440, description="실행 주기(분)")
    linked_rule_ids: List[str] = []
    mitre_technique_ids: List[str] = []
    mitre_tactic_ids: List[str] = []
    is_active: bool = True


class DetectionPolicyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_index: Optional[str] = None
    condition_config: Optional[Dict[str, Any]] = None
    trigger_condition: Optional[str] = None
    message_template: Optional[str] = None
    severity: Optional[str] = None
    interval_min: Optional[int] = Field(None, ge=1)
    linked_rule_ids: Optional[List[str]] = None
    mitre_technique_ids: Optional[List[str]] = None
    mitre_tactic_ids: Optional[List[str]] = None
    is_active: Optional[bool] = None


class DetectionPolicyResponse(DetectionPolicyCreate):
    # 구 문서에는 condition_config / interval_min 이 없을 수 있으므로 Optional로 오버라이드
    condition_config: Optional[Dict[str, Any]] = None
    interval_min: Optional[int] = None
    id: str
    last_run_at: Optional[datetime] = None
    last_triggered_at: Optional[datetime] = None
    total_events_count: int = 0
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DetectionPolicyListResponse(BaseModel):
    total: int
    items: List[DetectionPolicyResponse]


# --- Detection Event (탐지 이벤트) ---

class DetectionEventResponse(BaseModel):
    id: str
    policy_id: str
    policy_name: str
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


class DetectionEventListResponse(BaseModel):
    total: int
    items: List[DetectionEventResponse]


class DetectionEventStatusUpdate(BaseModel):
    status: str = Field(description="new / acknowledged / resolved / false_positive")
