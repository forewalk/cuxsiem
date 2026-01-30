"""사용자 Repository"""
import asyncio
from typing import Optional
from datetime import datetime
import uuid

from app.core.opensearch import get_opensearch_client
from app.models.user import User


class UserRepository:
    """사용자 정보 조회/관리"""

    def __init__(self):
        self.client = get_opensearch_client()
        self.index = "cs_users"

    async def get_by_email(self, email: str) -> Optional[User]:
        """이메일로 사용자 조회"""
        loop = asyncio.get_event_loop()

        def search():
            result = self.client.search(
                index=self.index,
                body={
                    "query": {
                        "bool": {
                            "must": [
                                {"term": {"email": email.lower()}}
                            ],
                            "must_not": [
                                {"exists": {"field": "deleted_at"}}
                            ]
                        }
                    }
                }
            )
            hits = result.get("hits", {}).get("hits", [])
            return hits[0]["_source"] if hits else None

        try:
            user_data = await loop.run_in_executor(None, search)
            if user_data:
                return self._dict_to_user(user_data)
        except Exception:
            pass

        return None

    async def create(self, user: User) -> User:
        """사용자 생성"""
        loop = asyncio.get_event_loop()

        def insert():
            self.client.index(
                index=self.index,
                id=user.id,
                body=user.to_dict(),
                refresh=True
            )
            return user

        return await loop.run_in_executor(None, insert)

    async def update_last_login(self, user_id: str) -> None:
        """마지막 로그인 시간 업데이트"""
        loop = asyncio.get_event_loop()

        def update():
            self.client.update(
                index=self.index,
                id=user_id,
                body={
                    "doc": {"last_login_at": datetime.utcnow().isoformat()}
                },
                refresh=True
            )

        await loop.run_in_executor(None, update)

    def _dict_to_user(self, data: dict) -> User:
        """딕셔너리를 User 객체로 변환"""
        return User(
            id=data["id"],
            email=data["email"],
            password_hash=data["password_hash"],
            name=data["name"],
            role=data["role"],
            is_active=data["is_active"],
            created_at=datetime.fromisoformat(data["created_at"]),
            updated_at=datetime.fromisoformat(data["updated_at"]),
            deleted_at=datetime.fromisoformat(data["deleted_at"]) if data.get("deleted_at") else None,
            last_login_at=datetime.fromisoformat(data["last_login_at"]) if data.get("last_login_at") else None,
        )
