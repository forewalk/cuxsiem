import asyncio
import logging
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime
import uuid

from app.core.opensearch import get_opensearch_client

logger = logging.getLogger(__name__)

class NotificationRepository:
    """알림 규칙 및 내역 Repository"""

    def __init__(self):
        self.client = get_opensearch_client()
        self.rules_index = "cs_alert_rules"
        self.alerts_index = "cs_alerts"

    # --- Notification Rules ---

    async def get_rule_by_id(self, rule_id: str) -> Optional[Dict[str, Any]]:
        """ID로 규칙 조회 (삭제된 규칙 제외)"""
        loop = asyncio.get_event_loop()
        def get():
            try:
                result = self.client.get(index=self.rules_index, id=rule_id)
                source = result["_source"]
                if source.get("deleted_at"):
                    return None
                return source
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

            # 최종 쿼리 구성 (삭제된 규칙 제외)
            if must_clauses:
                search_query = {
                    "bool": {
                        "must": must_clauses,
                        "must_not": [
                            {"exists": {"field": "deleted_at"}}
                        ]
                    }
                }
            else:
                search_query = {
                    "bool": {
                        "must_not": [
                            {"exists": {"field": "deleted_at"}}
                        ]
                    }
                }

            # last_triggered_at 정렬 시 null 값 처리
            if sort_by == "last_triggered_at":
                sort_config = {
                    sort_by: {
                        "order": order,
                        "missing": "_last" if order == "asc" else "_first"
                    }
                }
            else:
                sort_config = {sort_by: {"order": order}}
            
            result = self.client.search(
                index=self.rules_index,
                body={
                    "from": skip,
                    "size": limit,
                    "query": search_query,
                    "sort": [sort_config]
                }
            )
            total = result.get("hits", {}).get("total", {}).get("value", 0)
            hits = result.get("hits", {}).get("hits", [])
            rules = [hit["_source"] for hit in hits]
            return total, rules
        return await loop.run_in_executor(None, search)

    async def create_rule(self, rule_data: Dict[str, Any], user_id: str = "") -> Dict[str, Any]:
        """규칙 생성 및 운영 필드 초기화"""
        loop = asyncio.get_event_loop()
        rule_id = str(uuid.uuid4())

        now = datetime.utcnow().isoformat()
        rule_data.update({
            "id": rule_id,
            "created_at": now,
            "updated_at": now,
            "change_history": [{"user_id": user_id, "changed_at": now, "changed_fields": ["created"]}] if user_id else [],
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

    async def update_rule(self, rule_id: str, data: Dict[str, Any], user_id: str = "", changed_fields: list = None) -> Optional[Dict[str, Any]]:
        """규칙 수정"""
        loop = asyncio.get_event_loop()
        now = datetime.utcnow().isoformat()
        data["updated_at"] = now
        logger.info(f"[리포지토리] 규칙 업데이트 시작 - ID: {rule_id}")
        logger.info(f"[리포지토리] 업데이트할 데이터 키: {list(data.keys())}")
        
        def update_doc():
            try:
                existing = self.client.get(index=self.rules_index, id=rule_id)
                existing_doc = existing['_source']

                # change_history에 이력 추가
                if user_id:
                    history = existing_doc.get("change_history", [])
                    entry = {"user_id": user_id, "changed_at": now}
                    if changed_fields:
                        entry["changed_fields"] = changed_fields
                    history.append(entry)
                    data["change_history"] = history

                if 'condition_config' in data:
                    logger.info(f"[리포지토리] condition_config 포함 - 전체 문서 교체 방식 사용")
                    for key, value in data.items():
                        existing_doc[key] = value

                    self.client.index(
                        index=self.rules_index,
                        id=rule_id,
                        body=existing_doc,
                        refresh=True
                    )
                    logger.info(f"[리포지토리] condition_config 완전 교체 성공")
                else:
                    self.client.update(
                        index=self.rules_index,
                        id=rule_id,
                        body={"doc": data},
                        refresh=True
                    )
                    logger.info(f"[리포지토리] 일반 업데이트 성공")
                
                return True
            except Exception as e:
                logger.error(f"[리포지토리] OpenSearch 업데이트 실패 - ID: {rule_id}, 오류: {e}")
                return False
                
        if await loop.run_in_executor(None, update_doc):
            updated_rule = await self.get_rule_by_id(rule_id)
            if updated_rule and 'condition_config' in data:
                logger.info(f"[리포지토리] 업데이트 후 조회된 condition_config 키: {list(updated_rule.get('condition_config', {}).keys())}")
            return updated_rule
        return None

    async def delete_rule(self, rule_id: str) -> bool:
        """규칙 삭제 (Soft Delete)"""
        loop = asyncio.get_event_loop()
        def soft_delete():
            try:
                self.client.update(
                    index=self.rules_index,
                    id=rule_id,
                    body={
                        "doc": {
                            "deleted_at": datetime.utcnow().isoformat(),
                            "is_active": False,
                            "updated_at": datetime.utcnow().isoformat()
                        }
                    },
                    refresh=True
                )
                return True
            except Exception:
                return False
        return await loop.run_in_executor(None, soft_delete)

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

    async def update_alert(self, alert_id: str, data: Dict[str, Any]) -> bool:
        """알림 문서 부분 업데이트 (delivery_results 등)"""
        loop = asyncio.get_event_loop()
        def update():
            try:
                self.client.update(
                    index=self.alerts_index,
                    id=alert_id,
                    body={"doc": data},
                    refresh=True,
                )
                return True
            except Exception as e:
                logger.error(f"알림 업데이트 실패 ({alert_id}): {e}")
                return False
        return await loop.run_in_executor(None, update)

    async def get_alert_by_dedup_key(self, dedup_key: str) -> Optional[Dict[str, Any]]:
        """dedup_key로 기존 알림 조회"""
        loop = asyncio.get_event_loop()
        def search():
            try:
                result = self.client.search(
                    index=self.alerts_index,
                    body={
                        "query": {
                            "term": {
                                "dedup_key.keyword": dedup_key
                            }
                        },
                        "size": 1
                    }
                )
                hits = result.get("hits", {}).get("hits", [])
                if hits:
                    return hits[0]["_source"]
                return None
            except Exception:
                return None
        return await loop.run_in_executor(None, search)
    
    # 하위 호환성을 위한 별칭
    async def create_notification(self, notification_data: Dict[str, Any]) -> Dict[str, Any]:
        """하위 호환성을 위한 별칭 (create_alert 호출)"""
        return await self.create_alert(notification_data)

    async def list_alerts(
        self,
        skip: int = 0,
        limit: int = 100,
        query: Optional[str] = None,
        severities: Optional[List[str]] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        user_role: Optional[str] = None
    ) -> Tuple[int, List[Dict[str, Any]]]:
        """cs_alerts 인덱스에서 알림 내역 조회 with 검색, 시간 범위 및 role 기반 필터"""
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

            # 중요도 필터 (OR 조건)
            if severities:
                must_clauses.append({
                    "terms": {
                        "severity": severities
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

            # role 기반 필터링 (receiver.values 배열에 user_role이 포함된 알림만 조회)
            # user_role이 None이면 빈 결과 반환 (보안: 역할 불명 사용자에게 모든 알림 노출 방지)
            if not user_role:
                return 0, []
            must_clauses.append({
                "term": {
                    "receiver.values": user_role
                }
            })

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
        to_date: Optional[str] = None,
        user_role: Optional[str] = None
    ) -> Tuple[int, List[Dict[str, Any]]]:
        """하위 호환성을 위한 별칭 (list_alerts 호출)"""
        return await self.list_alerts(skip, limit, query, from_date, to_date, user_role)
