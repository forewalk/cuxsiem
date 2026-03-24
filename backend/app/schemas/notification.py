from typing import List, Optional, Any, Dict, Literal
from pydantic import BaseModel, Field, model_validator, ConfigDict
from datetime import datetime


# --- source_config 검증 모델 ---

class HealthCheckSourceConfig(BaseModel):
    """헬스체크 소스 조건 검증"""
    condition: Literal["status_down", "latency_high", "cert_expiring"]
    monitor_filter: str = Field(default="*", max_length=100)
    latency_threshold_ms: Optional[int] = Field(default=None, ge=1)
    days_before: Optional[int] = Field(default=None, ge=1, le=365)

    @model_validator(mode="after")
    def validate_condition_fields(self):
        if self.condition == "latency_high" and self.latency_threshold_ms is None:
            raise ValueError("latency_high 조건에는 latency_threshold_ms가 필수입니다")
        if self.condition == "cert_expiring" and self.days_before is None:
            raise ValueError("cert_expiring 조건에는 days_before가 필수입니다")
        return self


class AuthSourceConfig(BaseModel):
    """사용자 인증 소스 조건 검증"""
    condition: Literal["login_fail_surge", "account_locked"]
    account_filter: str = Field(default="*", max_length=100)
    fail_threshold: Optional[int] = Field(default=None, ge=1)
    time_window_min: Optional[int] = Field(default=None, ge=1, le=1440)

    @model_validator(mode="after")
    def validate_condition_fields(self):
        if self.condition == "login_fail_surge":
            if self.fail_threshold is None:
                raise ValueError("login_fail_surge 조건에는 fail_threshold가 필수입니다")
            if self.time_window_min is None:
                raise ValueError("login_fail_surge 조건에는 time_window_min이 필수입니다")
        return self


SOURCE_CONFIG_VALIDATORS = {
    "healthcheck": HealthCheckSourceConfig,
    "auth": AuthSourceConfig,
}


def validate_source_config(source_type: str, source_config: Dict[str, Any]) -> Dict[str, Any]:
    """source_type에 맞는 Pydantic 모델로 source_config를 검증 후 정규화하여 반환"""
    validator_cls = SOURCE_CONFIG_VALIDATORS.get(source_type)
    if not validator_cls:
        raise ValueError(f"지원하지 않는 소스 타입: {source_type}")
    validated = validator_cls(**source_config)
    return validated.model_dump()


# --- Notification Rule Schemas ---

class NotificationRuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    source_type: str = Field(description="소스 타입 (healthcheck, bom, license)")
    source_config: Dict[str, Any] = Field(description="소스별 구조화된 조건")
    message_template: str = Field(
        default="알림이 발생했습니다.",
        description="알림 메시지 템플릿"
    )
    severity: str = "info"
    interval_min: int = Field(ge=1, le=1440, description="평가 주기(분)")
    receiver: Dict[str, Any] = Field(default_factory=lambda: {"type": "role", "values": ["role-1"]})
    is_active: bool = True


class NotificationRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    source_type: Optional[str] = None
    source_config: Optional[Dict[str, Any]] = None
    message_template: Optional[str] = None
    severity: Optional[str] = None
    interval_min: Optional[int] = Field(None, ge=1)
    receiver: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    changed_fields: Optional[List[str]] = Field(None, exclude=True)


class ChangeHistoryEntry(BaseModel):
    user_id: str
    changed_at: datetime
    changed_fields: List[str] = []


class NotificationRuleResponse(NotificationRuleBase):
    id: str
    last_run_at: Optional[datetime] = None
    last_triggered_at: Optional[datetime] = None
    total_alerts_count: int = 0
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    change_history: List[ChangeHistoryEntry] = []

    model_config = ConfigDict(from_attributes=True)


class NotificationRuleListResponse(BaseModel):
    total: int
    items: List[NotificationRuleResponse]


# --- 알림 내역 (cs_alerts 인덱스) ---

class AlertBase(BaseModel):
    """알림 내역 기본 스키마"""
    rule_id: str
    rule_name: str
    rule_description: Optional[str] = None
    rule_severity: str

    source_type: Optional[str] = None
    source_detail: Optional[Dict[str, Any]] = None

    message: str = Field(description="렌더링된 메시지")
    message_template: str = Field(description="원본 메시지 템플릿")
    dedup_key: str
    receiver: Optional[Dict[str, Any]] = None
    status: str = "created"
    error_message: Optional[str] = None


class AlertResponse(AlertBase):
    """알림 내역 응답 스키마"""
    id: str
    severity: Optional[str] = None
    created_at: datetime
    delivery_results: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class AlertListResponse(BaseModel):
    """알림 내역 목록 응답"""
    total: int
    items: List[AlertResponse]


# --- 프리뷰 ---

class PreviewRequest(BaseModel):
    source_type: str
    source_config: Dict[str, Any]


class PreviewResponse(BaseModel):
    would_trigger: bool
    matched_count: int = 0
    details: List[Dict[str, Any]] = []
    message_preview: Optional[str] = None


# 하위 호환성 별칭
NotificationBase = AlertBase
NotificationResponse = AlertResponse
NotificationListResponse = AlertListResponse
