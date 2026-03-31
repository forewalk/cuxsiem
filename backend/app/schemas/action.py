from typing import Optional, Dict
from pydantic import BaseModel, Field
from datetime import datetime

class TargetHost(BaseModel):
    url: str
    port: int
    path: Optional[str] = "/"

class ActionLogic(BaseModel):
    dsl: str
    type: str  # e.g., 'webhook', 'rest_api'

class ActionBase(BaseModel):
    name: str
    description: Optional[str] = None
    target_host: TargetHost
    action_logic: ActionLogic
    headers: Optional[Dict[str, str]] = Field(default_factory=dict)

class ActionCreate(ActionBase):
    user_id: Optional[str] = None

class ActionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_host: Optional[TargetHost] = None
    action_logic: Optional[ActionLogic] = None
    headers: Optional[Dict[str, str]] = None

class ActionResponse(ActionBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True
