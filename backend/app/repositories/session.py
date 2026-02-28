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
                data = result["_source"]
                data["id"] = result["_id"]
                return data
            except Exception:
                return None

        session_data = await loop.run_in_executor(None, search)
        return self._dict_to_session(session_data) if session_data else None

    async def get_by_token_hash(self, token_hash: str) -> Optional[Session]:
        """토큰 해시로 세션 조회"""
        loop = asyncio.get_event_loop()

        def search():
            try:
                query = {
                    "query": {
                        "term": {
                            "token_hash": token_hash
                        }
                    }
                }
                result = self.client.search(index=self.index, body=query)
                hits = result.get("hits", {}).get("hits", [])
                if hits:
                    data = hits[0]["_source"]
                    data["id"] = hits[0]["_id"]
                    return data
                return None
            except Exception:
                return None

        session_data = await loop.run_in_executor(None, search)
        return self._dict_to_session(session_data) if session_data else None

    async def get_active_sessions_by_user_id(self, user_id: str) -> list[Session]:
        """사용자의 활성 세션 목록 조회 (만료되지 않은 세션만)"""
        loop = asyncio.get_event_loop()
        now_iso = datetime.utcnow().isoformat()

        def search():
            try:
                query = {
                    "size": 10000,
                    "query": {
                        "bool": {
                            "filter": [
                                {"bool": {
                                    "should": [
                                        {"term": {"user_id": user_id}},
                                        {"term": {"user_id.keyword": user_id}}
                                    ],
                                    "minimum_should_match": 1
                                }},
                                {"term": {"is_active": True}},
                                {"range": {"expires_at": {"gt": now_iso}}}
                            ]
                        }
                    }
                }
                result = self.client.search(index=self.index, body=query)
                sessions = []
                for hit in result["hits"]["hits"]:
                    data = hit["_source"]
                    data["id"] = hit["_id"]
                    sessions.append(data)
                return sessions
            except Exception as e:
                import logging
                logging.error(f"Error querying active sessions: {e}")
                return []

        session_data_list = await loop.run_in_executor(None, search)
        return [self._dict_to_session(data) for data in session_data_list]

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
