"""패스워드 정책 Repository"""
import asyncio
from typing import Optional
from datetime import datetime

from app.core.opensearch import get_opensearch_client
from app.models.password_policy import PasswordPolicy


class PasswordPolicyRepository:
    """패스워드 정책 관리"""

    def __init__(self):
        self.client = get_opensearch_client()
        self.index = "cs_policies"

    async def get_policy(self) -> Optional[PasswordPolicy]:
        """현재 정책 조회"""
        loop = asyncio.get_event_loop()

        def get():
            try:
                # 'default' ID를 가진 문서를 가져옴
                result = self.client.get(index=self.index, id="password")
                return result["_source"]
            except Exception:
                return None

        data = await loop.run_in_executor(None, get)
        if data:
            return self._dict_to_policy(data, "password")
        return None

    async def update_policy(self, policy: PasswordPolicy) -> PasswordPolicy:
        """정책 업데이트 또는 생성"""
        loop = asyncio.get_event_loop()

        def upsert():
            self.client.index(
                index=self.index,
                id="password",
                body=policy.to_dict(),
                refresh=True
            )
            return policy

        return await loop.run_in_executor(None, upsert)

    def _dict_to_policy(self, data: dict, doc_id: str) -> PasswordPolicy:
        """딕셔너리를 PasswordPolicy 객체로 변환"""
        return PasswordPolicy(
            id=doc_id,
            min_length=data["min_length"],
            require_uppercase=data["require_uppercase"],
            require_lowercase=data["require_lowercase"],
            require_numbers=data["require_numbers"],
            require_special_chars=data["require_special_chars"],
            max_password_age_days=data["max_password_age_days"],
            password_history_count=data["password_history_count"],
            lockout_threshold=data["lockout_threshold"],
            lockout_duration_minutes=data["lockout_duration_minutes"],
            created_at=datetime.fromisoformat(data["created_at"]),
            updated_at=datetime.fromisoformat(data["updated_at"]),
        )
