from pydantic import BaseModel, ConfigDict
from datetime import datetime

class AdvancedSettingsBase(BaseModel):
    user_register: bool
    allow_multiple_sessions: bool = False
    tab_count: int = 10
    user_id: str = "global"
    pagination_size: int = 10
    time_filter_duration: int = 15
    time_filter_unit: str = "m"
    pixel_mode: bool = False
    log_stream_size: int = 1000       # 로그스트리밍 최대 건수 (100~10000)
    log_stream_refresh: int = 10      # 로그스트리밍 새로고침 주기(초) (5~60)
    session_duration: int = 30        # 세션 유지시간(분) (1~1440)
    otp_required: bool = False        # 모든 사용자에게 OTP 강제

class AdvancedSettingsUpdate(AdvancedSettingsBase):
    pass

class AdvancedSettingsResponse(AdvancedSettingsBase):
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
