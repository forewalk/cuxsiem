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
    pagination_size: int = 10
    time_filter_duration: int = 15
    time_filter_unit: str = "m"
    pixel_mode: bool = False

    def to_dict(self) -> dict:
        return {
            "user_register": self.user_register,
            "allow_multiple_sessions": self.allow_multiple_sessions,
            "tab_count": self.tab_count,
            "updated_at": self.updated_at.isoformat(),
            "pagination_size": self.pagination_size,
            "time_filter_duration": self.time_filter_duration,
            "time_filter_unit": self.time_filter_unit,
            "pixel_mode": self.pixel_mode,
        }
