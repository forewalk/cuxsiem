from dataclasses import dataclass
from datetime import datetime

@dataclass
class Code:
    id: string
    code_name: string
    updated_at: datetime

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "code_name": self.code_name,
            "updated_at": self.updated_at.isoformat()
        }
