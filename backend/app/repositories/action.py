from typing import List, Optional, Dict, Any
from datetime import datetime
from opensearchpy import OpenSearch
from app.schemas.action import ActionCreate, ActionUpdate

class ActionRepository:
    def __init__(self, client: OpenSearch):
        self.client = client
        self.index = "cs_action"

    async def create(self, action: ActionCreate) -> str:
        doc = action.model_dump()
        # ISO 8601 포맷 문자열로 저장하여 OpenSearch 데이터 일관성 유지
        now = datetime.utcnow().isoformat()
        doc["created_at"] = now
        doc["updated_at"] = None
        doc["deleted_at"] = None
        
        response = self.client.index(index=self.index, body=doc, refresh=True)
        return response["_id"]

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        query = {
            "query": {
                "bool": {
                    "must_not": {"exists": {"field": "deleted_at"}}
                }
            },
            "from": skip,
            "size": limit,
            "sort": [{"created_at": {"order": "desc"}}]
        }
        
        response = self.client.search(index=self.index, body=query)
        actions = []
        now_str = datetime.utcnow().isoformat()
        for hit in response["hits"]["hits"]:
            action = hit["_source"]
            action["id"] = hit["_id"]
            
            # 필드명 호환성 유지 (created_at 또는 createdAt)
            if "createdAt" in action and "created_at" not in action:
                action["created_at"] = action["createdAt"]
            
            # created_at이 없을 경우에 대한 방어 로직
            if "created_at" not in action or action["created_at"] is None:
                action["created_at"] = action.get("updated_at") or now_str # fallback

            actions.append(action)
        return actions

    async def get_by_id(self, action_id: str) -> Optional[Dict[str, Any]]:
        try:
            response = self.client.get(index=self.index, id=action_id)
            action = response["_source"]
            if action.get("deleted_at"):
                return None
            action["id"] = response["_id"]
            
            # 필드명 호환성 유지
            if "createdAt" in action and "created_at" not in action:
                action["created_at"] = action["createdAt"]
                
            return action
        except:
            return None

    async def get_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        query = {
            "query": {
                "bool": {
                    "must": [
                        {"term": {"name.keyword": name}}
                    ],
                    "must_not": {"exists": {"field": "deleted_at"}}
                }
            }
        }
        try:
            response = self.client.search(index=self.index, body=query)
            if response["hits"]["total"]["value"] > 0:
                hit = response["hits"]["hits"][0]
                action = hit["_source"]
                action["id"] = hit["_id"]
                
                # 필드명 호환성 유지
                if "createdAt" in action and "created_at" not in action:
                    action["created_at"] = action["createdAt"]
                    
                return action
            return None
        except:
            return None

    async def update(self, action_id: str, action_update: ActionUpdate) -> bool:
        doc = action_update.model_dump(exclude_unset=True)
        doc["updated_at"] = datetime.utcnow().isoformat()
        
        try:
            self.client.update(
                index=self.index, 
                id=action_id, 
                body={"doc": doc}, 
                refresh=True
            )
            return True
        except:
            return False

    async def delete(self, action_id: str) -> bool:
        # Soft delete
        doc = {"deleted_at": datetime.utcnow().isoformat()}
        try:
            self.client.update(
                index=self.index, 
                id=action_id, 
                body={"doc": doc}, 
                refresh=True
            )
            return True
        except:
            return False
