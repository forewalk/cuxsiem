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
        self.alerts_index = "cs_alerts"  # 변경: cs_notifications → cs_alerts

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

    async def list_rules(
        self,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "created_at",
        order: str = "desc",
        query: Optional[str] = None,
        severities: Optional[List[str]] = None,
        is_active: Optional[bool] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ) -> Tuple[int, List[Dict[str, Any]]]:
        """규칙 목록 조회 with 검색/필터/시간범위"""
        loop = asyncio.get_event_loop()

        def search():
            # 검색 및 필터 쿼리 구성
            must_clauses = []

            # 규칙명 검색 (fuzzy + wildcard for partial match)
            if query:
                must_clauses.append({
                    "bool": {
                        "should": [
                            {
                                "match": {
                                    "name": {
                                        "query": query,
                                        "fuzziness": "AUTO"
                                    }
                                }
                            },
                            {
                                "wildcard": {
                                    "name": f"*{query.lower()}*"
                                }
                            }
                        ],
                        "minimum_should_match": 1
                    }
                })

            # 중요도 필터 (OR 조건)
            if severities:
                must_clauses.append({
                    "terms": {
                        "severity": severities
                    }
                })

            # 활성화 여부 필터
            if is_active is not None:
                must_clauses.append({
                    "term": {
                        "is_active": is_active
                    }
                })

            # 시간 범위 필터 (created_at 기준)
            if from_date or to_date:
                range_filter = {"range": {"created_at": {}}}
                if from_date:
                    range_filter["range"]["created_at"]["gte"] = from_date
                if to_date:
                    range_filter["range"]["created_at"]["lte"] = to_date
                must_clauses.append(range_filter)

            # 최종 쿼리 구성
            if must_clauses:
                search_query = {
                    "bool": {
                        "must": must_clauses
                    }
                }
            else:
                search_query = {"match_all": {}}

            result = self.client.search(
                index=self.rules_index,
                body={
                    "from": skip,
                    "size": limit,
                    "query": search_query,
                    "sort": [{sort_by: {"order": order}}]
                }
            )
            total = result.get("hits", {}).get("total", {}).get("value", 0)
            hits = result.get("hits", {}).get("hits", [])
            rules = [hit["_source"] for hit in hits]
            return total, rules
        return await loop.run_in_executor(None, search)

    async def create_rule(self, rule_data: Dict[str, Any]) -> Dict[str, Any]:
        """규칙 생성 및 운영 필드 초기화"""
        loop = asyncio.get_event_loop()
        rule_id = str(uuid.uuid4())

        # 기본 및 운영 필드 초기값 설정
        now = datetime.utcnow().isoformat()
        rule_data.update({
            "id": rule_id,
            "created_at": now,
            "updated_at": now,
            "error_count": 0,
            "total_alerts_count": 0,
            "last_error": None
        })

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
        """규칙 삭제 (Soft Delete 권장되나 현재는 Hard Delete)"""
        loop = asyncio.get_event_loop()
        def delete_doc():
            try:
                self.client.delete(index=self.rules_index, id=rule_id, refresh=True)
                return True
            except Exception:
                return False
        return await loop.run_in_executor(None, delete_doc)

    # --- Alerts (알림 내역) ---

    async def create_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """알림을 cs_alerts 인덱스에 저장"""
        loop = asyncio.get_event_loop()
        alert_id = str(uuid.uuid4())
        alert_data["id"] = alert_id
        alert_data["created_at"] = alert_data.get("created_at") or datetime.utcnow().isoformat()

        def insert():
            self.client.index(
                index=self.alerts_index,
                id=alert_id,
                body=alert_data,
                refresh=True
            )
            return alert_data
        return await loop.run_in_executor(None, insert)
    
    # 하위 호환성을 위한 별칭
    async def create_notification(self, notification_data: Dict[str, Any]) -> Dict[str, Any]:
        """하위 호환성을 위한 별칭 (create_alert 호출)"""
        return await self.create_alert(notification_data)

    async def list_alerts(
        self,
        skip: int = 0,
        limit: int = 100,
        query: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ) -> Tuple[int, List[Dict[str, Any]]]:
        """cs_alerts 인덱스에서 알림 내역 조회 with 검색 및 시간 범위 필터"""
        loop = asyncio.get_event_loop()

        def search():
            # 검색 및 필터 쿼리 구성
            must_clauses = []

            # 규칙명/메시지 검색 (multi_match + wildcard)
            if query:
                must_clauses.append({
                    "bool": {
                        "should": [
                            {
                                "multi_match": {
                                    "query": query,
                                    "fields": ["rule_name", "message", "rule_description"],
                                    "fuzziness": "AUTO"
                                }
                            },
                            {
                                "wildcard": {
                                    "rule_name": f"*{query.lower()}*"
                                }
                            },
                            {
                                "wildcard": {
                                    "message": f"*{query.lower()}*"
                                }
                            }
                        ],
                        "minimum_should_match": 1
                    }
                })

            # 시간 범위 필터
            if from_date or to_date:
                range_filter = {"range": {"created_at": {}}}
                if from_date:
                    range_filter["range"]["created_at"]["gte"] = from_date
                if to_date:
                    range_filter["range"]["created_at"]["lte"] = to_date
                must_clauses.append(range_filter)

            # 최종 쿼리 구성
            if must_clauses:
                search_query = {
                    "bool": {
                        "must": must_clauses
                    }
                }
            else:
                search_query = {"match_all": {}}

            result = self.client.search(
                index=self.alerts_index,
                body={
                    "from": skip,
                    "size": limit,
                    "query": search_query,
                    "sort": [{"created_at": {"order": "desc"}}]
                }
            )
            total = result.get("hits", {}).get("total", {}).get("value", 0)
            hits = result.get("hits", {}).get("hits", [])
            alerts = [hit["_source"] for hit in hits]
            return total, alerts
        return await loop.run_in_executor(None, search)
    
    # 하위 호환성을 위한 별칭
    async def list_notifications(
        self,
        skip: int = 0,
        limit: int = 100,
        query: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ) -> Tuple[int, List[Dict[str, Any]]]:
        """하위 호환성을 위한 별칭 (list_alerts 호출)"""
        return await self.list_alerts(skip, limit, query, from_date, to_date)
