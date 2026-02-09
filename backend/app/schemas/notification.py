from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime

# --- Notification Rule Schemas ---

class NotificationRuleBase(BaseModel):
    name: str
    target_index: str = "threats"
    condition_type: str = "dsl_query"
    condition_config: Dict[str, Any]
    severity: str
    interval_min: int = Field(ge=1)
    window_min: int = Field(ge=1)
    dedup_ttl_min: Optional[int] = 30
    webhooks: List[str] = []
    receiver_group_name: Optional[str] = None
    is_active: bool = True

class NotificationRuleCreate(NotificationRuleBase):
    id: str

class NotificationRuleUpdate(BaseModel):
    name: Optional[str] = None
    target_index: Optional[str] = None
    condition_type: Optional[str] = None
    condition_config: Optional[Dict[str, Any]] = None
    severity: Optional[str] = None
    interval_min: Optional[int] = Field(None, ge=1)
    window_min: Optional[int] = Field(None, ge=1)
    dedup_ttl_min: Optional[int] = None
    webhooks: Optional[List[str]] = None
    receiver_group_name: Optional[str] = None
    is_active: Optional[bool] = None

class NotificationRuleResponse(NotificationRuleBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Notification Log Schemas ---

class NotificationBase(BaseModel):
    rule_id: str
    severity: str
    title: str
    message: str
    event_ref: str
    dedup_key: str
    is_read: bool = False
    status: str = "created"
    error_message: Optional[str] = None

class NotificationResponse(NotificationBase):
    id: str
    created_at: datetime
    sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class NotificationReadUpdate(BaseModel):
    is_read: bool
