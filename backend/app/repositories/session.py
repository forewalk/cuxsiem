"""세션 Repository"""
import asyncio
from datetime import datetime
from typing import Optional

from app.core.opensearch import get_opensearch_client
from app.models.user import Session


class SessionRepository:
    """세션 관리"""

    def __init__(self):
        self.client = get_opensearch_client()
        self.index = "cs_sessions"

    async def create(self, session: Session) -> Session:
        """세션 생성"""
        loop = asyncio.get_event_loop()

        def insert():
            self.client.index(
                index=self.index,
                id=session.id,
                body=session.to_dict(),
                refresh=True
            )
            return session

        return await loop.run_in_executor(None, insert)

    async def get_by_id(self, session_id: str) -> Optional[Session]:
        """세션 ID로 조회"""
        loop = asyncio.get_event_loop()

        def search():
            try:
                result = self.client.get(index=self.index, id=session_id)
                return result["_source"]
            except Exception:
                return None

        session_data = await loop.run_in_executor(None, search)
        return self._dict_to_session(session_data) if session_data else None

    async def invalidate(self, session_id: str) -> None:
        """세션 무효화 (로그아웃)"""
        loop = asyncio.get_event_loop()

        def update():
            self.client.update(
                index=self.index,
                id=session_id,
                body={
                    "doc": {"is_active": False}
                },
                refresh=True
            )

        await loop.run_in_executor(None, update)

    def _dict_to_session(self, data: dict) -> Session:
        """딕셔너리를 Session 객체로 변환"""
        return Session(
            id=data["id"],
            user_id=data["user_id"],
            token_hash=data["token_hash"],
            ip_address=data.get("ip_address"),
            user_agent=data.get("user_agent"),
            created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else None,
            expires_at=datetime.fromisoformat(data["expires_at"]) if data.get("expires_at") else None,
            is_active=data.get("is_active", True),
        )
