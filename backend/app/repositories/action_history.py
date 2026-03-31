from typing import List, Optional, Dict, Any
from datetime import datetime
from opensearchpy import OpenSearch

class ActionHistoryRepository:
    def __init__(self, client: OpenSearch):
        self.client = client
        self.index = "cs_action_history"

    async def create(self, history_data: Dict[str, Any]) -> str:
        if "created_at" not in history_data:
            history_data["created_at"] = datetime.utcnow().isoformat()
        
        response = self.client.index(index=self.index, body=history_data, refresh=True)
        return response["_id"]

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        query = {
            "query": {"match_all": {}},
            "from": skip,
            "size": limit,
            "sort": [{"created_at": {"order": "desc"}}]
        }
        
        response = self.client.search(index=self.index, body=query)
        histories = []
        for hit in response["hits"]["hits"]:
            history = hit["_source"]
            history["id"] = hit["_id"]
            histories.append(history)
        return histories

    async def get_by_id(self, history_id: str) -> Optional[Dict[str, Any]]:
        try:
            response = self.client.get(index=self.index, id=history_id)
            history = response["_source"]
            history["id"] = response["_id"]
            return history
        except:
            return None
