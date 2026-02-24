import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from app.core.opensearch import get_opensearch_client

class DashboardRepository:
    def __init__(self):
        self.client = get_opensearch_client()
        self.fixed_index = "logs-sentinel_one.threats"

    def _parse_iso_date(self, date_str: Optional[str]) -> Optional[datetime]:
        if not date_str: return None
        try:
            dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            return dt.replace(tzinfo=None)
        except: return None

    def _parse_time(self, value: int, unit: str) -> timedelta:
        if unit == "m": return timedelta(minutes=value)
        if unit == "h": return timedelta(hours=value)
        if unit == "d": return timedelta(days=value)
        return timedelta(minutes=15)

    async def get_stats(self, index_name: str, from_value, from_unit, to_value, to_unit, from_date, to_date, query) -> Dict[str, Any]:
        loop = asyncio.get_event_loop()
        now = datetime.utcnow()
        start_time = self._parse_iso_date(from_date) or (now - self._parse_time(from_value or 15, from_unit or "m"))
        end_time = self._parse_iso_date(to_date) or (now - self._parse_time(to_value or 0, to_unit or "m") if to_value else now)

        diff = end_time - start_time
        if diff <= timedelta(hours=1): interval = "1m"
        elif diff <= timedelta(days=1): interval = "30m"
        elif diff <= timedelta(days=7): interval = "12h"
        else: interval = "1d"

        def search():
            must_queries = [{"range": {"@timestamp": {"gte": start_time.isoformat(), "lte": end_time.isoformat()}}}]
            if query: must_queries.append({"query_string": {"query": query, "analyze_wildcard": True, "default_operator": "AND"}})
            body = {
                "size": 0, "track_total_hits": True,
                "query": {"bool": {"must": must_queries, "must_not": [{"exists": {"field": "deleted_at"}}]}},
                "aggs": {
                    "logs_over_time": {"date_histogram": {"field": "@timestamp", "fixed_interval": interval, "extended_bounds": {"min": start_time.isoformat(), "max": end_time.isoformat()}, "min_doc_count": 0}},
                    "resolved_count": {"filter": {"term": {"threatInfo.incidentStatus": "resolved"}}},
                    "unresolved_count": {"filter": {"term": {"threatInfo.incidentStatus": "unresolved"}}},
                    "active_count": {"filter": {"term": {"threatInfo.incidentStatus": "active"}}},
                    "blocked_count": {"filter": {"term": {"threatInfo.mitigationStatus": "blocked"}}},
                    "mitigated_count": {"filter": {"term": {"threatInfo.mitigationStatus": "mitigated"}}},
                    "suspicious_count": {"filter": {"term": {"threatInfo.confidenceLevel": "suspicious"}}},
                    "detection_engines": {"terms": {"field": "threatInfo.detectionEngines.title", "size": 10}},
                    "prevalent_threats": {"terms": {"field": "threatInfo.threatName", "size": 10}},
                    "agent_status": {"terms": {"field": "agentRealtimeInfo.agentDetectionState", "size": 10}},
                    "mitigation_status": {"terms": {"field": "threatInfo.mitigationStatus", "size": 10}},
                    "severity_dist": {"terms": {"field": "threatInfo.severity", "size": 10}},
                    "agent_os_dist": {"terms": {"field": "osName", "size": 10}},
                    "agent_version_dist": {"terms": {"field": "agentVersion", "size": 10}},
                    "agent_scan_status": {"terms": {"field": "scanStatus", "size": 10}}
                }
            }
            return self.client.search(index=index_name, body=body)
        return await loop.run_in_executor(None, search)

    async def get_indices(self) -> List[str]: return [self.fixed_index]

    async def get_field_mappings(self, index_name: str) -> List[Dict[str, str]]:
        loop = asyncio.get_event_loop()
        def get_mapping():
            try:
                mapping = self.client.indices.get_mapping(index=index_name)
                actual_index = list(mapping.keys())[0] if mapping else None
                if not actual_index: return []
                properties = mapping.get(actual_index, {}).get("mappings", {}).get("properties", {})
                fields = []
                def extract_fields(props, prefix=""):
                    for field_name, info in props.items():
                        full_name = f"{prefix}{field_name}"
                        if "properties" in info: extract_fields(info["properties"], f"{full_name}.")
                        else: fields.append({"name": full_name, "type": info.get("type", "text")})
                extract_fields(properties)
                return sorted(fields, key=lambda x: x["name"])
            except: return []
        return await loop.run_in_executor(None, get_mapping)

    async def get_panels(self, dashboard_id: str) -> List[Dict[str, Any]]:
        loop = asyncio.get_event_loop()
        def search():
            body = {"query": {"match": {"dashboard_id": dashboard_id}}, "sort": [{"display_order": {"order": "asc"}}], "size": 100}
            try:
                res = self.client.search(index="cs_dashboards", body=body)
                panels = []
                for hit in res["hits"]["hits"]:
                    source = hit["_source"]
                    if "updated_at" in source and isinstance(source["updated_at"], str):
                        try: source["updated_at"] = datetime.fromisoformat(source["updated_at"].replace("Z", "+00:00"))
                        except: source["updated_at"] = datetime.utcnow()
                    panels.append(source)
                return panels
            except: return []
        return await loop.run_in_executor(None, search)

    async def update_panel(self, dashboard_id: str, panel_key: str, data: Dict[str, Any]) -> bool:
        loop = asyncio.get_event_loop()
        doc_id = f"{dashboard_id}_{panel_key}"
        def update():
            try:
                self.client.update(index="cs_dashboards", id=doc_id, body={"doc": {**data, "updated_at": datetime.utcnow().isoformat()}}, refresh=True)
                return True
            except: return False
        return await loop.run_in_executor(None, update)

    async def bulk_update_panels(self, dashboard_id: str, updates: List[Dict[str, Any]]) -> bool:
        loop = asyncio.get_event_loop()
        def bulk():
            body = []
            for item in updates:
                doc_id = f"{dashboard_id}_{item['panel_key']}"
                body.append({"update": {"_index": "cs_dashboards", "_id": doc_id}})
                body.append({"doc": {**item, "updated_at": datetime.utcnow().isoformat()}})
            try:
                self.client.bulk(body=body, refresh=True)
                return True
            except: return False
        return await loop.run_in_executor(None, bulk)

    async def get_logs(self, index_name: str, from_date=None, to_date=None, from_value=None, from_unit=None, to_value=None, to_unit=None, query=None, size=20, offset=0, sort_order="desc") -> List[Dict[str, Any]]:
        loop = asyncio.get_event_loop()
        now = datetime.utcnow()
        start_time = self._parse_iso_date(from_date) or (now - self._parse_time(from_value or 15, from_unit or "m"))
        end_time = self._parse_iso_date(to_date) or (now - self._parse_time(to_value or 0, to_unit or "m") if to_value else now)
        def search():
            must_queries = [{"range": {"@timestamp": {"gte": start_time.isoformat(), "lte": end_time.isoformat()}}}]
            if query and query.strip(): must_queries.append({"query_string": {"query": query, "analyze_wildcard": True, "default_operator": "AND"}})
            body = {"size": size, "from": offset, "track_total_hits": True, "query": {"bool": {"must": must_queries, "must_not": [{"exists": {"field": "deleted_at"}}]}}, "sort": [{"@timestamp": {"order": sort_order}}]}
            try:
                res = self.client.search(index=index_name, body=body)
                return [hit["_source"] for hit in res.get("hits", {}).get("hits", [])]
            except: return []
        return await loop.run_in_executor(None, search)
