"""고급 설정 모델"""
from dataclasses import dataclass
from datetime import datetime

@dataclass
class AdvancedSettings:
    """고급 설정 데이터 클래스"""
    user_register: bool
    allow_multiple_sessions: bool
    tab_count: int
    updated_at: datetime
    user_id: str = "global"           # 사용자별 설정을 위한 ID (기본값은 global)
    pagination_size: int = 10
    time_filter_duration: int = 15
    time_filter_unit: str = "m"
    pixel_mode: bool = False
    log_stream_size: int = 1000       # 로그스트리밍 최대 건수 (100~10000)
    log_stream_refresh: int = 10      # 로그스트리밍 새로고침 주기(초) (5~60)
    session_duration: int = 30        # 세션 유지시간(분) (1~1440)
    otp_required: bool = False        # 모든 사용자에게 OTP 강제

    def to_dict(self) -> dict:
        return {
            "user_register": self.user_register,
            "allow_multiple_sessions": self.allow_multiple_sessions,
            "tab_count": self.tab_count,
            "updated_at": self.updated_at.isoformat(),
            "user_id": self.user_id,
            "pagination_size": self.pagination_size,
            "time_filter_duration": self.time_filter_duration,
            "time_filter_unit": self.time_filter_unit,
            "pixel_mode": self.pixel_mode,
            "log_stream_size": self.log_stream_size,
            "log_stream_refresh": self.log_stream_refresh,
            "session_duration": self.session_duration,
            "otp_required": self.otp_required,
        }
