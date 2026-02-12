from pydantic import BaseModel
from datetime import datetime

class AdvancedSettingsBase(BaseModel):
    user_register: bool

class AdvancedSettingsUpdate(AdvancedSettingsBase):
    pass

class AdvancedSettingsResponse(AdvancedSettingsBase):
    updated_at: datetime

    class Config:
        from_attributes = True
