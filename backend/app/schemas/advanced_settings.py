from pydantic import BaseModel, ConfigDict
from datetime import datetime

class AdvancedSettingsBase(BaseModel):
    user_register: bool
    allow_multiple_sessions: bool = False
    tab_count: int = 10
    pagination_size: int = 10
    time_filter_duration: int = 15
    time_filter_unit: str = "m"
    pixel_mode: bool = False
    log_stream_size: int = 1000       # 로그스트리밍 최대 건수 (100~10000)
    log_stream_refresh: int = 10      # 로그스트리밍 새로고침 주기(초) (5~60)

class AdvancedSettingsUpdate(AdvancedSettingsBase):
    pass

class AdvancedSettingsResponse(AdvancedSettingsBase):
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
