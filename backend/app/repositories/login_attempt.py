"""로그인 시도 기록 Repository"""
import asyncio
from datetime import datetime, timedelta

from app.core.opensearch import get_opensearch_client
from app.models.user import LoginAttempt


class LoginAttemptRepository:
    """로그인 시도 이력 관리"""

    def __init__(self):
        self.client = get_opensearch_client()
        self.index = "cs_login_attempts"

    async def record(self, account: str, success: bool, ip_address: str = None, error_message: str = None) -> LoginAttempt:
        """로그인 시도 기록"""
        import uuid
        attempt = LoginAttempt(
            id=str(uuid.uuid4()),
            account=account,
            success=success,
            attempted_at=datetime.utcnow(),
            ip_address=ip_address,
            error_message=error_message,
        )

        loop = asyncio.get_event_loop()

        def insert():
            self.client.index(
                index=self.index,
                id=attempt.id,
                body=attempt.to_dict(),
                refresh=True
            )
            return attempt

        return await loop.run_in_executor(None, insert)

    async def count_failed_attempts(self, account: str, minutes: int = 10) -> int:
        """최근 N분 내 실패 시도 횟수"""
        loop = asyncio.get_event_loop()

        def search():
            since = (datetime.utcnow() - timedelta(minutes=minutes)).isoformat()
            result = self.client.search(
                index=self.index,
                body={
                    "query": {
                        "bool": {
                            "must": [
                                {"term": {"account": account}},
                                {"term": {"success": False}},
                                {"range": {"attempted_at": {"gte": since}}}
                            ]
                        }
                    }
                }
            )
            return result.get("hits", {}).get("total", {}).get("value", 0)

        return await loop.run_in_executor(None, search)
