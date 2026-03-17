import asyncio
import logging
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime
import uuid

from app.core.opensearch import get_opensearch_client

logger = logging.getLogger(__name__)


class DetectionPolicyRepository:

    def __init__(self):
        self.client = get_opensearch_client()
        self.policies_index = "cs_detection_policies"
        self.events_index = "cs_detection_events"

    # ── Policy CRUD ──────────────────────────────────────────────────────

    async def list_policies(
        self,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "created_at",
        order: str = "desc",
        query: Optional[str] = None,
        severity: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[int, List[Dict[str, Any]]]:
        loop = asyncio.get_event_loop()

        def search():
            must = []
            must_not = [{"exists": {"field": "deleted_at"}}]

            if query:
                must.append({
                    "bool": {
                        "should": [
                            {"match": {"name": {"query": query, "fuzziness": "AUTO"}}},
                            {"wildcard": {"name": f"*{query.lower()}*"}},
                        ],
                        "minimum_should_match": 1,
                    }
                })
            if severity:
                must.append({"term": {"severity": severity}})
            if is_active is not None:
                must.append({"term": {"is_active": is_active}})

            q = {"bool": {"must": must, "must_not": must_not}} if must else {"bool": {"must_not": must_not}}

            result = self.client.search(
                index=self.policies_index,
                body={
                    "from": skip,
                    "size": limit,
                    "query": q,
                    "sort": [{sort_by: {"order": order}}],
                },
            )
            total = result["hits"]["total"]["value"]
            items = [h["_source"] for h in result["hits"]["hits"]]
            return total, items

        return await loop.run_in_executor(None, search)

    async def get_policy_by_id(self, policy_id: str) -> Optional[Dict[str, Any]]:
        loop = asyncio.get_event_loop()

        def get():
            try:
                result = self.client.get(index=self.policies_index, id=policy_id)
                source = result["_source"]
                if source.get("deleted_at"):
                    return None
                return source
            except Exception:
                return None

        return await loop.run_in_executor(None, get)

    async def create_policy(self, data: Dict[str, Any], user_id: str = "") -> Dict[str, Any]:
        loop = asyncio.get_event_loop()
        policy_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        data.update({
            "id": policy_id,
            "last_run_at": None,
            "last_triggered_at": None,
            "total_events_count": 0,
            "created_by": user_id,
            "created_at": now,
            "updated_at": now,
        })

        def insert():
            self.client.index(index=self.policies_index, id=policy_id, body=data, refresh=True)
            return data

        return await loop.run_in_executor(None, insert)

    async def update_policy(self, policy_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        loop = asyncio.get_event_loop()
        data["updated_at"] = datetime.utcnow().isoformat()

        def update():
            try:
                existing = self.client.get(index=self.policies_index, id=policy_id)
                doc = existing["_source"]
                if doc.get("deleted_at"):
                    return None
                if "condition_config" in data:
                    doc.update(data)
                    self.client.index(index=self.policies_index, id=policy_id, body=doc, refresh=True)
                else:
                    self.client.update(index=self.policies_index, id=policy_id, body={"doc": data}, refresh=True)
                    doc.update(data)
                return doc
            except Exception as e:
                logger.error(f"정책 업데이트 실패 ({policy_id}): {e}")
                return None

        return await loop.run_in_executor(None, update)

    async def delete_policy(self, policy_id: str) -> bool:
        loop = asyncio.get_event_loop()

        def soft_delete():
            try:
                now = datetime.utcnow().isoformat()
                self.client.update(
                    index=self.policies_index,
                    id=policy_id,
                    body={"doc": {"deleted_at": now, "is_active": False, "updated_at": now}},
                    refresh=True,
                )
                return True
            except Exception as e:
                logger.error(f"정책 삭제 실패 ({policy_id}): {e}")
                return False

        return await loop.run_in_executor(None, soft_delete)

    # ── Detection Event ──────────────────────────────────────────────────

    async def create_event(self, data: Dict[str, Any]) -> Dict[str, Any]:
        loop = asyncio.get_event_loop()
        event_id = str(uuid.uuid4())
        data["id"] = event_id
        data["created_at"] = data.get("created_at") or datetime.utcnow().isoformat()

        def insert():
            self.client.index(index=self.events_index, id=event_id, body=data, refresh=True)
            return data

        return await loop.run_in_executor(None, insert)

    async def list_events(
        self,
        skip: int = 0,
        limit: int = 50,
        sort_by: str = "created_at",
        order: str = "desc",
        policy_id: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
    ) -> Tuple[int, List[Dict[str, Any]]]:
        loop = asyncio.get_event_loop()

        def search():
            must = []
            if policy_id:
                must.append({"term": {"policy_id": policy_id}})
            if severity:
                must.append({"term": {"severity": severity}})
            if status:
                must.append({"term": {"status": status}})
            if from_date or to_date:
                rng: Dict[str, Any] = {}
                if from_date:
                    rng["gte"] = from_date
                if to_date:
                    rng["lte"] = to_date
                must.append({"range": {"created_at": rng}})

            q = {"bool": {"must": must}} if must else {"match_all": {}}

            result = self.client.search(
                index=self.events_index,
                body={
                    "from": skip,
                    "size": limit,
                    "query": q,
                    "sort": [{sort_by: {"order": order}}],
                },
            )
            total = result["hits"]["total"]["value"]
            items = [h["_source"] for h in result["hits"]["hits"]]
            return total, items

        return await loop.run_in_executor(None, search)

    async def update_event_status(self, event_id: str, status: str) -> Optional[Dict[str, Any]]:
        loop = asyncio.get_event_loop()

        def update():
            try:
                self.client.update(
                    index=self.events_index,
                    id=event_id,
                    body={"doc": {"status": status}},
                    refresh=True,
                )
                result = self.client.get(index=self.events_index, id=event_id)
                return result["_source"]
            except Exception as e:
                logger.error(f"이벤트 상태 변경 실패 ({event_id}): {e}")
                return None

        return await loop.run_in_executor(None, update)
