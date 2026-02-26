"""고급 설정 모델"""
from dataclasses import dataclass
from datetime import datetime

@dataclass
class AdvancedSettings:
    """고급 설정 데이터 클래스"""
    user_register: bool
    tab_count: int
    updated_at: datetime

    def to_dict(self) -> dict:
        return {
            "user_register": self.user_register,
            "tab_count": self.tab_count,
            "updated_at": self.updated_at.isoformat()
        }
