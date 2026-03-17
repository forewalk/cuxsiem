import asyncio
import logging
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime
import uuid

from app.core.opensearch import get_opensearch_client

logger = logging.getLogger(__name__)

# 경량 목록 조회 시 포함할 필드
LIST_SOURCE_FIELDS = [
    "id", "sigma_id", "name", "level_normalized", "status",
    "log_source_category", "log_source_product",
    "tags", "mitre_technique_ids", "mitre_tactic_ids",
    "revision", "updated_at",
]


class SigmaRuleRepository:

    def __init__(self):
        self.client = get_opensearch_client()
        self.rules_index = "cs_detection_rules"
        self.history_index = "cs_detection_rule_history"
        self.jobs_index = "cs_rule_import_jobs"

    # --- 목록 조회 (경량) ---

    async def list_rules(
        self,
        skip: int = 0,
        limit: int = 20,
        sort_by: str = "updated_at",
        order: str = "desc",
        search: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        log_source_product: Optional[str] = None,
        mitre_technique_id: Optional[str] = None,
    ) -> Tuple[int, List[Dict[str, Any]]]:
        loop = asyncio.get_event_loop()

        def do_search():
            must = []
            must_not = [{"term": {"is_deleted": True}}]

            if search:
                must.append({
                    "bool": {
                        "should": [
                            {"match": {"name": {"query": search, "fuzziness": "AUTO"}}},
                            {"wildcard": {"name": f"*{search.lower()}*"}},
                        ],
                        "minimum_should_match": 1,
                    }
                })
            if severity:
                must.append({"term": {"level_normalized": severity}})
            if status:
                must.append({"term": {"status": status}})
            if log_source_product:
                must.append({"term": {"log_source_product": log_source_product}})
            if mitre_technique_id:
                must.append({"term": {"mitre_technique_ids": mitre_technique_id}})

            query = {"bool": {"must": must, "must_not": must_not}} if must else {"bool": {"must_not": must_not}}

            sort_field = f"{sort_by}.keyword" if sort_by == "name" else sort_by
            result = self.client.search(
                index=self.rules_index,
                body={
                    "from": skip,
                    "size": limit,
                    "query": query,
                    "_source": LIST_SOURCE_FIELDS,
                    "sort": [{sort_field: {"order": order}}],
                },
            )
            total = result.get("hits", {}).get("total", {}).get("value", 0)
            items = [hit["_source"] for hit in result.get("hits", {}).get("hits", [])]
            return total, items

        return await loop.run_in_executor(None, do_search)

    # --- 단건 조회 (전체 필드) ---

    async def get_rule_by_id(self, rule_id: str) -> Optional[Dict[str, Any]]:
        loop = asyncio.get_event_loop()

        def get():
            try:
                result = self.client.get(index=self.rules_index, id=rule_id)
                source = result["_source"]
                if source.get("is_deleted"):
                    return None
                return source
            except Exception:
                return None

        return await loop.run_in_executor(None, get)

    # --- sigma_id 기준 조회 (import upsert용) ---

    async def get_rule_by_sigma_id(self, sigma_id: str) -> Optional[Dict[str, Any]]:
        loop = asyncio.get_event_loop()

        def search():
            try:
                result = self.client.search(
                    index=self.rules_index,
                    body={"query": {"term": {"sigma_id": sigma_id}}, "size": 1},
                )
                hits = result.get("hits", {}).get("hits", [])
                return hits[0]["_source"] if hits else None
            except Exception:
                return None

        return await loop.run_in_executor(None, search)

    # --- 룰 생성 ---

    async def create_rule(self, rule_data: Dict[str, Any]) -> Dict[str, Any]:
        loop = asyncio.get_event_loop()
        rule_id = rule_data.get("id") or str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        rule_data.update({
            "id": rule_id,
            "is_deleted": False,
            "created_at": rule_data.get("created_at") or now,
            "updated_at": rule_data.get("updated_at") or now,
        })

        def insert():
            self.client.index(index=self.rules_index, id=rule_id, body=rule_data, refresh=True)
            return rule_data

        return await loop.run_in_executor(None, insert)

    # --- 룰 업데이트 ---

    async def update_rule(self, rule_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        loop = asyncio.get_event_loop()
        data["updated_at"] = datetime.utcnow().isoformat()

        def update():
            try:
                existing = self.client.get(index=self.rules_index, id=rule_id)
                doc = existing["_source"]
                doc.update(data)
                self.client.index(index=self.rules_index, id=rule_id, body=doc, refresh=True)
                return doc
            except Exception as e:
                logger.error(f"룰 업데이트 실패 ({rule_id}): {e}")
                return None

        return await loop.run_in_executor(None, update)

    # --- 토글 (active ↔ inactive) ---

    async def toggle_status(self, rule_id: str) -> Optional[Dict[str, Any]]:
        loop = asyncio.get_event_loop()

        def toggle():
            try:
                existing = self.client.get(index=self.rules_index, id=rule_id)
                doc = existing["_source"]
                if doc.get("is_deleted"):
                    return None
                new_status = "inactive" if doc.get("status") == "active" else "active"
                now = datetime.utcnow().isoformat()
                self.client.update(
                    index=self.rules_index,
                    id=rule_id,
                    body={"doc": {"status": new_status, "updated_at": now}},
                    refresh=True,
                )
                return {"id": rule_id, "status": new_status, "updated_at": now}
            except Exception as e:
                logger.error(f"토글 실패 ({rule_id}): {e}")
                return None

        return await loop.run_in_executor(None, toggle)

    # --- Soft Delete ---

    async def delete_rule(self, rule_id: str, deleted_by: Optional[str] = None) -> bool:
        loop = asyncio.get_event_loop()

        def soft_delete():
            try:
                now = datetime.utcnow().isoformat()
                doc = {
                    "status": "deleted",
                    "is_deleted": True,
                    "deleted_at": now,
                    "updated_at": now,
                }
                if deleted_by:
                    doc["deleted_by"] = deleted_by
                self.client.update(
                    index=self.rules_index,
                    id=rule_id,
                    body={"doc": doc},
                    refresh=True,
                )
                return True
            except Exception as e:
                logger.error(f"삭제 실패 ({rule_id}): {e}")
                return False

        return await loop.run_in_executor(None, soft_delete)

    # --- 통계 ---

    async def get_stats(self) -> Dict[str, Any]:
        loop = asyncio.get_event_loop()

        def agg():
            try:
                result = self.client.search(
                    index=self.rules_index,
                    body={
                        "size": 0,
                        "query": {"bool": {"must_not": [{"term": {"is_deleted": True}}]}},
                        "aggs": {
                            "by_severity": {"terms": {"field": "level_normalized", "size": 10}},
                            "by_status": {"terms": {"field": "status", "size": 10}},
                            "tactics_count": {"cardinality": {"field": "mitre_tactic_ids"}},
                            "techniques_count": {"cardinality": {"field": "mitre_technique_ids"}},
                        },
                    },
                )
                total = result["hits"]["total"]["value"]
                aggs = result.get("aggregations", {})

                by_severity = {b["key"]: b["doc_count"] for b in aggs.get("by_severity", {}).get("buckets", [])}
                by_status = {b["key"]: b["doc_count"] for b in aggs.get("by_status", {}).get("buckets", [])}
                mitre = {
                    "tactics_count": aggs.get("tactics_count", {}).get("value", 0),
                    "techniques_count": aggs.get("techniques_count", {}).get("value", 0),
                }
                return {"total": total, "by_severity": by_severity, "by_status": by_status, "mitre_coverage": mitre}
            except Exception as e:
                logger.error(f"통계 조회 실패: {e}")
                return {"total": 0, "by_severity": {}, "by_status": {}, "mitre_coverage": {}}

        return await loop.run_in_executor(None, agg)

    # --- History (이력 저장) ---

    async def create_history(self, history_data: Dict[str, Any]) -> Dict[str, Any]:
        loop = asyncio.get_event_loop()
        history_id = str(uuid.uuid4())
        history_data["id"] = history_id
        history_data["changed_at"] = history_data.get("changed_at") or datetime.utcnow().isoformat()

        def insert():
            self.client.index(index=self.history_index, id=history_id, body=history_data, refresh=True)
            return history_data

        return await loop.run_in_executor(None, insert)

    # --- Import Job ---

    async def create_import_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        loop = asyncio.get_event_loop()
        job_id = job_data.get("job_id", str(uuid.uuid4()))
        job_data["job_id"] = job_id

        def insert():
            self.client.index(index=self.jobs_index, id=job_id, body=job_data, refresh=True)
            return job_data

        return await loop.run_in_executor(None, insert)

    async def update_import_job(self, job_id: str, data: Dict[str, Any]) -> bool:
        loop = asyncio.get_event_loop()

        def update():
            try:
                self.client.update(index=self.jobs_index, id=job_id, body={"doc": data}, refresh=True)
                return True
            except Exception as e:
                logger.error(f"Import job 업데이트 실패 ({job_id}): {e}")
                return False

        return await loop.run_in_executor(None, update)

    # --- 벌크 인덱스 존재 확인 ---

    async def check_index_exists(self) -> bool:
        loop = asyncio.get_event_loop()

        def check():
            try:
                return self.client.indices.exists(index=self.rules_index)
            except Exception:
                return False

        return await loop.run_in_executor(None, check)

    # --- 벌크 Upsert ---

    async def bulk_upsert(self, operations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """OpenSearch _bulk API로 일괄 upsert"""
        loop = asyncio.get_event_loop()

        def do_bulk():
            body = []
            for op in operations:
                action = op["action"]
                doc_id = op["id"]
                doc = op["doc"]
                if action == "index":
                    body.append({"index": {"_index": self.rules_index, "_id": doc_id}})
                    body.append(doc)
                elif action == "update":
                    body.append({"update": {"_index": self.rules_index, "_id": doc_id}})
                    body.append({"doc": doc})
            if not body:
                return {"errors": False, "items": []}
            return self.client.bulk(body=body, refresh=True)

        return await loop.run_in_executor(None, do_bulk)
