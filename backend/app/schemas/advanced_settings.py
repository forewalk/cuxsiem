from pydantic import BaseModel, ConfigDict
from datetime import datetime

class AdvancedSettingsBase(BaseModel):
    user_register: bool
    tab_count: int = 10
    pagination_size: int = 10
    time_filter_duration: int = 15
    time_filter_unit: str = "m"

class AdvancedSettingsUpdate(AdvancedSettingsBase):
    pass

class AdvancedSettingsResponse(AdvancedSettingsBase):
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
