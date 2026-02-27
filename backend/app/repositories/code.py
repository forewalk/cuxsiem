import asyncio
from typing import List, Optional
from datetime import datetime

from app.core.opensearch import get_opensearch_client

class CodeRepository:
    def __init__(self):
        self.client = get_opensearch_client()
        self.index = "cs_code"

    async def get_codes(self) -> List[dict]:
        """모든 코드 조회 (role-1 ~ role-4 위주)"""
        loop = asyncio.get_event_loop()

        def search():
            try:
                # role-1 ~ role-4 ID를 가진 문서들 검색
                query = {
                    "query": {
                        "terms": {
                            "_id": ["role-1", "role-2", "role-3", "role-4"]
                        }
                    },
                    "sort": [{"_id": "asc"}]
                }
                result = self.client.search(index=self.index, body=query)
                return [
                    {
                        "id": hit["_id"],
                        "code_name": hit["_source"].get("code_name", ""),
                        "updated_at": hit["_source"].get("updated_at", datetime.utcnow().isoformat())
                    }
                    for hit in result["hits"]["hits"]
                ]
            except Exception as e:
                print(f"Error searching cs_code: {e}")
                return []

        return await loop.run_in_executor(None, search)

    async def upsert_code(self, code_id: str, code_name: str) -> dict:
        """코드 정보 업데이트 (없으면 생성)"""
        loop = asyncio.get_event_loop()

        def upsert():
            body = {
                "code_name": code_name,
                "updated_at": datetime.utcnow().isoformat()
            }
            self.client.index(
                index=self.index,
                id=code_id,
                body=body,
                refresh=True
            )
            return {"id": code_id, "code_name": code_name, "updated_at": body["updated_at"]}

        return await loop.run_in_executor(None, upsert)

code_repository = CodeRepository()
