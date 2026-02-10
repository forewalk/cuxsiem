import asyncio
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime
import uuid

from app.core.opensearch import get_opensearch_client

class NotificationRepository:
    """알림 규칙 및 내역 Repository"""

    def __init__(self):
        self.client = get_opensearch_client()
        self.rules_index = "cs_notification_rules"
        self.notifications_index = "cs_notifications"

    # --- Notification Rules ---

    async def get_rule_by_id(self, rule_id: str) -> Optional[Dict[str, Any]]:
        """ID로 규칙 조회"""
        loop = asyncio.get_event_loop()
        def get():
            try:
                result = self.client.get(index=self.rules_index, id=rule_id)
                return result["_source"]
            except Exception:
                return None
        return await loop.run_in_executor(None, get)

    async def list_rules(self, skip: int = 0, limit: int = 100, sort_by: str = "created_at", order: str = "desc") -> Tuple[int, List[Dict[str, Any]]]:
        """규칙 목록 조회 (정렬 지원)"""
        loop = asyncio.get_event_loop()
        def search():
            result = self.client.search(
                index=self.rules_index,
                body={
                    "from": skip,
                    "size": limit,
                    "query": {"match_all": {}},
                    "sort": [{sort_by: {"order": order}}]
                }
            )
            total = result.get("hits", {}).get("total", {}).get("value", 0)
            hits = result.get("hits", {}).get("hits", [])
            rules = [hit["_source"] for hit in hits]
            return total, rules
        return await loop.run_in_executor(None, search)

    async def create_rule(self, rule_data: Dict[str, Any]) -> Dict[str, Any]:
        """규칙 생성"""
        loop = asyncio.get_event_loop()
        rule_id = rule_data.get("id") or str(uuid.uuid4())
        rule_data["id"] = rule_id
        rule_data["created_at"] = rule_data.get("created_at") or datetime.utcnow().isoformat()
        rule_data["updated_at"] = rule_data.get("updated_at") or datetime.utcnow().isoformat()

        def insert():
            self.client.index(
                index=self.rules_index,
                id=rule_id,
                body=rule_data,
                refresh=True
            )
            return rule_data
        return await loop.run_in_executor(None, insert)

    async def update_rule(self, rule_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """규칙 수정"""
        loop = asyncio.get_event_loop()
        data["updated_at"] = datetime.utcnow().isoformat()
        def update_doc():
            try:
                self.client.update(
                    index=self.rules_index,
                    id=rule_id,
                    body={"doc": data},
                    refresh=True
                )
                return True
            except Exception:
                return False
        if await loop.run_in_executor(None, update_doc):
            return await self.get_rule_by_id(rule_id)
        return None

    async def delete_rule(self, rule_id: str) -> bool:
        """규칙 삭제"""
        loop = asyncio.get_event_loop()
        def delete_doc():
            try:
                self.client.delete(index=self.rules_index, id=rule_id, refresh=True)
                return True
            except Exception:
                return False
        return await loop.run_in_executor(None, delete_doc)

    # --- Notifications ---

    async def create_notification(self, notification_data: Dict[str, Any]) -> Dict[str, Any]:
        """알림 내역 생성"""
        loop = asyncio.get_event_loop()
        notif_id = str(uuid.uuid4())
        notification_data["id"] = notif_id
        notification_data["created_at"] = notification_data.get("created_at") or datetime.utcnow().isoformat()

        def insert():
            self.client.index(
                index=self.notifications_index,
                id=notif_id,
                body=notification_data,
                refresh=True
            )
            return notification_data
        return await loop.run_in_executor(None, insert)

    async def list_notifications(
        self,
        skip: int = 0,
        limit: int = 100,
        receiver_type: Optional[str] = None,
        receiver_value: Optional[str] = None
    ) -> Tuple[int, List[Dict[str, Any]]]:
        """알림 내역 조회 (필터 포함)"""
        loop = asyncio.get_event_loop()

        def search():
            must = []
            if receiver_type:
                must.append({"term": {"receiver.type": receiver_type}})
            if receiver_value:
                must.append({"term": {"receiver.values": receiver_value}})

            query = {"bool": {"must": must}} if must else {"match_all": {}}

            result = self.client.search(
                index=self.notifications_index,
                body={
                    "from": skip,
                    "size": limit,
                    "query": query,
                    "sort": [{"created_at": {"order": "desc"}}]
                }
            )
            total = result.get("hits", {}).get("total", {}).get("value", 0)
            hits = result.get("hits", {}).get("hits", [])
            notifications = [hit["_source"] for hit in hits]
            return total, notifications
        return await loop.run_in_executor(None, search)

    async def mark_as_sent(self, notification_id: str, status: str, error: str = None) -> bool:
        """발송 상태 및 시간 기록"""
        loop = asyncio.get_event_loop()
        data = {
            "status": status,
            "sent_at": datetime.utcnow().isoformat()
        }
        if error:
            data["error_message"] = error

        def update():
            try:
                self.client.update(
                    index=self.notifications_index,
                    id=notification_id,
                    body={"doc": data},
                    refresh=True
                )
                return True
            except Exception:
                return False
        return await loop.run_in_executor(None, update)
