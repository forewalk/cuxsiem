from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, model_validator
from datetime import datetime

# --- 알림 채널(발송 수단) 설정 ---

class WebhookConfig(BaseModel):
    url: str
    method: str = "POST"
    headers: Dict[str, str] = {}

class SlackConfig(BaseModel):
    channel: str
    webhook_url: str

class EmailConfig(BaseModel):
    recipients: List[str]
    subject_template: Optional[str] = None

class NotificationChannels(BaseModel):
    """확장 가능한 알림 채널 정의"""
    webhooks: List[WebhookConfig] = []
    slack: List[SlackConfig] = []
    email: List[EmailConfig] = []

# --- Notification Rule Schemas ---

class NotificationRuleBase(BaseModel):
    name: str
    target_index: str = "logs-sentinel_one.threats"
    condition_type: str = "dsl_query"
    condition_config: Dict[str, Any]
    severity: str

    # 주기 및 범위 설정
    interval_min: int = Field(ge=1, description="탐지 실행 주기(분)")
    window_min: int = Field(ge=1, description="탐지 데이터 조회 범위(분)")

    # 중복 제거 설정
    dedup_ttl_min: int = Field(default=30, ge=0)
    dedup_key_template: str = Field(
        default="{{rule_id}}",
        description="중복 키 생성을 위한 템플릿 (예: {{rule_id}}_{{source_ip}})"
    )

    # 발송 채널 및 수신 설정
    channels: NotificationChannels = Field(default_factory=NotificationChannels)
    receiver: Dict[str, Any] = Field(default_factory=lambda: {"type": "role", "values": ["admin"]})

    is_active: bool = True

    @model_validator(mode='after')
    def validate_window_and_interval(self) -> 'NotificationRuleBase':
        if self.window_min < self.interval_min:
            raise ValueError("window_min must be greater than or equal to interval_min to avoid detection gaps.")
        return self

class NotificationRuleUpdate(BaseModel):
    name: Optional[str] = None
    target_index: Optional[str] = None
    condition_type: Optional[str] = None
    condition_config: Optional[Dict[str, Any]] = None
    severity: Optional[str] = None
    interval_min: Optional[int] = Field(None, ge=1)
    window_min: Optional[int] = Field(None, ge=1)
    dedup_ttl_min: Optional[int] = None
    dedup_key_template: Optional[str] = None
    channels: Optional[NotificationChannels] = None
    receiver: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

    @model_validator(mode='after')
    def validate_window_and_interval(self) -> 'NotificationRuleUpdate':
        if self.window_min is not None and self.interval_min is not None:
            if self.window_min < self.interval_min:
                raise ValueError("window_min must be greater than or equal to interval_min")
        return self

class NotificationRuleResponse(NotificationRuleBase):
    id: str

    # 운영 관리 필드
    last_run_at: Optional[datetime] = None
    last_success_at: Optional[datetime] = None
    last_triggered_at: Optional[datetime] = None
    last_error: Optional[str] = None
    error_count: int = 0
    total_alerts_count: int = 0

    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- 알림 내역 ---

class NotificationBase(BaseModel):
    rule_id: str
    title: str
    message: str
    event_ref: str
    dedup_key: str
    receiver: Optional[Dict[str, Any]] = None
    status: str = "created"
    error_message: Optional[str] = None

    # 발송 증적 필드
    channel: Optional[str] = None
    endpoint: Optional[str] = None
    request_headers: Optional[Dict[str, Any]] = None
    outgoing_payload: Optional[Dict[str, Any]] = None
    response_status_code: Optional[int] = None
    response_body: Optional[str] = None

class NotificationResponse(NotificationBase):
    id: str
    severity: Optional[str] = None
    created_at: datetime
    sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True
