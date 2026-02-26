from pydantic import BaseModel, ConfigDict
from datetime import datetime

class AdvancedSettingsBase(BaseModel):
    user_register: bool
    tab_count: int = 10

class AdvancedSettingsUpdate(AdvancedSettingsBase):
    pass

class AdvancedSettingsResponse(AdvancedSettingsBase):
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
