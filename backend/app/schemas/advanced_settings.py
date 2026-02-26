from pydantic import BaseModel
from datetime import datetime

class AdvancedSettingsBase(BaseModel):
    user_register: bool
    tab_count: int = 10

class AdvancedSettingsUpdate(AdvancedSettingsBase):
    pass

class AdvancedSettingsResponse(AdvancedSettingsBase):
    updated_at: datetime

    class Config:
        from_attributes = True
