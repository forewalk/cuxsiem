import asyncio
import json
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

    def _preprocess_query(self, query: Optional[str]) -> Optional[str]:
        if not query: return query
        import re
        q = query

        # 1. 따옴표 내부의 역슬래시(\)를 이스케이프(\\) 처리 (윈도우 경로 등 지원)
        # 예: "C:\Users" -> "C:\\Users"
        def escape_backslashes(match):
            content = match.group(1)
            escaped = content.replace("\\", "\\\\")
            return f'"{escaped}"'
        
        q = re.sub(r'"([^"]*)"', escape_backslashes, q)

        # 2. isActive: "1" -> isActive: true 등 불리언 변환
        # : "1" -> : true
        q = re.sub(r':\s*["\']?1["\']?', ': true', q)
        # : "0" -> : false
        q = re.sub(r':\s*["\']?0["\']?', ': false', q)
        # : "true" -> : true
        q = re.sub(r':\s*["\']true["\']', ': true', q, flags=re.IGNORECASE)
        # : "false" -> : false
        q = re.sub(r':\s*["\']false["\']', ': false', q, flags=re.IGNORECASE)
        return q

    async def get_stats(self, index_name: str, panels: List[Dict[str, Any]], from_value, from_unit, to_value, to_unit, from_date, to_date, query) -> Dict[str, Any]:
        loop = asyncio.get_event_loop()
        now = datetime.utcnow()
        start_time = self._parse_iso_date(from_date) or (now - self._parse_time(from_value or 15, from_unit or "m"))
        end_time = self._parse_iso_date(to_date) or (now - self._parse_time(to_value or 0, to_unit or "m") if to_value else now)
        
        # 쿼리 전처리 (불리언 값 등 처리)
        processed_query = self._preprocess_query(query)

        diff = end_time - start_time
        if diff <= timedelta(minutes=10): interval = "10s"
        elif diff <= timedelta(minutes=30): interval = "30s"
        elif diff <= timedelta(hours=1): interval = "1m"
        elif diff <= timedelta(days=1): interval = "30m"
        elif diff <= timedelta(days=7): interval = "12h"
        else: interval = "1d"

        def search():
            must_queries = [{"range": {"@timestamp": {"gte": start_time.isoformat(), "lte": end_time.isoformat()}}}]
            if processed_query and processed_query.strip():
                must_queries.append({"query_string": {"query": processed_query, "analyze_wildcard": True, "default_operator": "AND"}})

            # 시스템 기본 집계 템플릿
            agg_templates = {
                "total_threats": {"filter": {"match_all": {}}},
                "resolved_threats": {"filter": {"term": {"threatInfo.incidentStatus": "resolved"}}},
                "unresolved_threats": {"filter": {"term": {"threatInfo.incidentStatus": "unresolved"}}},
                "active_threats": {"filter": {"bool": {"must": [{"term": {"threatInfo.incidentStatus": "resolved"}}, {"term": {"threatInfo.mitigationStatus": "active"}}]}}},
                "blocked_threats": {"filter": {"bool": {"must": [{"term": {"threatInfo.mitigationStatus": "blocked"}}], "must_not": [{"term": {"threatInfo.incidentStatus": "resolved"}}]}}},
                "mitigated_threats": {"filter": {"bool": {"must": [{"term": {"threatInfo.mitigationStatus": "mitigated"}}], "must_not": [{"term": {"threatInfo.incidentStatus": "resolved"}}]}}},
                "suspicious_threats": {"filter": {"bool": {"must": [{"term": {"threatInfo.incidentStatus": "resolved"}}, {"term": {"threatInfo.mitigationStatus": "active"}}]}}},
                "detection_engine": {"terms": {"field": "threatInfo.detectionEngines.title", "size": 10}},
                "severity_dist": {"terms": {"field": "threatInfo.severity", "size": 10}},
                "prevalent_threats": {"terms": {"field": "threatInfo.threatName", "size": 10}},
                "agent_status_dist": {"terms": {"field": "agentRealtimeInfo.agentDetectionState", "size": 10}},
                "mitigation_stats": {"terms": {"field": "threatInfo.mitigationStatus", "size": 10}},
                "agent_os_dist": {"terms": {"field": "osName", "size": 10}},
                "agent_version_dist": {"terms": {"field": "agentVersion", "size": 10}},
                "agent_scan_status": {"terms": {"field": "scanStatus", "size": 10}},
                "total_agents": {"filter": {"match_all": {}}},
                "active_agents": {"filter": {"term": {"isActive": True}}},
                "inactive_agents": {"filter": {"term": {"isActive": False}}},
                "infected_agents": {"filter": {"term": {"infected": True}}},
                "edr_event_categories": {"terms": {"field": "event.category", "size": 20}}
            }

            final_aggs = {
                "logs_over_time": {"date_histogram": {"field": "@timestamp", "fixed_interval": interval, "extended_bounds": {"min": start_time.isoformat(), "max": end_time.isoformat()}, "min_doc_count": 0}}
            }

            for p in panels:
                pk = p['panel_key']
                w_type = p.get('widget_type', 'metric')
                t_field = p.get('target_field')
                c_query = p.get('custom_query')

                # 1. 시스템 기본 템플릿 사용 여부 결정
                # 패널 타입이 변경되었거나 타겟 필드가 명시적으로 있으면 커스텀으로 간주하여 기본 템플릿 무시
                is_custom_setup = (pk not in agg_templates) or (t_field and agg_templates[pk].get("terms", {}).get("field") != t_field)
                
                # 원형/바 차트로 바뀌었거나 신규 패널인 경우 terms 집계 생성
                if w_type in ["pie", "bar"]:
                    agg_body = {"terms": {"field": t_field or "@timestamp", "size": 10}}
                elif pk in agg_templates and not is_custom_setup:
                    agg_body = agg_templates[pk].copy()
                else:
                    # 기본은 metric (filter match_all)
                    agg_body = {"filter": {"match_all": {}}}

                # 3. 쿼리 필터 적용 (시스템 기본 필터를 사용자가 입력한 쿼리로 대체)
                if c_query and c_query.strip():
                    try:
                        # JSON 형태의 쿼리인지 확인
                        f_q = json.loads(c_query) if c_query.strip().startswith('{') else {"query_string": {"query": c_query, "analyze_wildcard": True, "default_operator": "AND"}}
                    except:
                        f_q = {"query_string": {"query": c_query, "analyze_wildcard": True}}
                    
                    if "terms" in agg_body: 
                        # 차트인 경우: 필터로 감싸고 그 안에 집계 추가
                        final_aggs[pk] = {"filter": f_q, "aggs": {"inner": agg_body}}
                    else:
                        # 메트릭인 경우: 필터 자체를 교체
                        final_aggs[pk] = {"filter": f_q}
                else:
                    # 커스텀 쿼리가 없으면 아까 생성한 agg_body 사용
                    final_aggs[pk] = agg_body

            body = {"size": 0, "track_total_hits": True, "query": {"bool": {"must": must_queries, "must_not": [{"exists": {"field": "deleted_at"}}]}}, "aggs": final_aggs}
            try:
                return self.client.search(index=index_name, body=body)
            except:
                return {"hits": {"total": {"value": 0}, "hits": []}, "aggregations": {}}
        return await loop.run_in_executor(None, search)

    async def get_indices(self) -> List[str]: return [self.fixed_index, "logs-sentinel_one.agents", "logs-sentinel_one.edr"]
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

    async def get_panels(self, dashboard_id: str, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        loop = asyncio.get_event_loop()
        def search():
            must_queries = [{"match": {"dashboard_id": dashboard_id}}]
            if user_id: must_queries.append({"match": {"user_id": user_id}})
            else: must_queries.append({"bool": {"must_not": [{"exists": {"field": "user_id"}}]}})
            
            body = {
                "query": {"bool": {"must": must_queries}},
                "sort": [{"display_order": {"order": "asc"}}],
                "size": 100
            }
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

    async def bulk_update_panels(self, dashboard_id: str, updates: List[Dict[str, Any]], user_id: Optional[str] = None) -> bool:
        existing_panels = await self.get_panels(dashboard_id, user_id)
        existing_keys = {p['panel_key'] for p in existing_panels}
        new_keys = {item['panel_key'] for item in updates}
        keys_to_delete = existing_keys - new_keys
        loop = asyncio.get_event_loop()
        def bulk():
            body = []
            for item in updates:
                # user_id가 있으면 ID에 포함
                doc_id = f"{dashboard_id}_{user_id}_{item['panel_key']}" if user_id else f"{dashboard_id}_{item['panel_key']}"
                body.append({"index": {"_index": "cs_dashboards", "_id": doc_id}})
                doc_body = {"dashboard_id": dashboard_id, **item, "updated_at": datetime.utcnow().isoformat()}
                if user_id: doc_body["user_id"] = user_id
                body.append(doc_body)
            for pk in keys_to_delete:
                doc_id = f"{dashboard_id}_{user_id}_{pk}" if user_id else f"{dashboard_id}_{pk}"
                body.append({"delete": {"_index": "cs_dashboards", "_id": doc_id}})
            if not body: return True
            try:
                self.client.bulk(body=body, refresh=True)
                return True
            except: return False
        return await loop.run_in_executor(None, bulk)

    async def get_logs(self, index_name: str, from_date=None, to_date=None, from_value=None, from_unit=None, to_value=None, to_unit=None, query=None, size=20, offset=0, sort_field="@timestamp", sort_order="desc") -> List[Dict[str, Any]]:
        loop = asyncio.get_event_loop()
        now = datetime.utcnow()
        start_time = self._parse_iso_date(from_date) or (now - self._parse_time(from_value or 15, from_unit or "m"))
        end_time = self._parse_iso_date(to_date) or (now - self._parse_time(to_value or 0, to_unit or "m") if to_value else now)
        
        # 쿼리 전처리
        processed_query = self._preprocess_query(query)

        def search():
            must_queries = [{"range": {"@timestamp": {"gte": start_time.isoformat(), "lte": end_time.isoformat()}}}]
            if processed_query and processed_query.strip(): must_queries.append({"query_string": {"query": processed_query, "analyze_wildcard": True, "default_operator": "AND"}})
            
            # 정렬 필드가 존재하지 않을 경우를 대비한 처리 (Keyword 필드 권장)
            actual_sort_field = sort_field
            if actual_sort_field != "@timestamp" and not actual_sort_field.endswith(".keyword"):
                # 텍스트 필드의 경우 정렬을 위해 .keyword를 붙이는 것이 일반적임 (OpenSearch 관례)
                # 다만 모든 필드에 적용하기보다는 프론트엔드에서 제어하거나 여기서 유연하게 처리
                pass

            sort_body = [{actual_sort_field: {"order": sort_order}}]
            
            body = {
                "size": size, 
                "from": offset, 
                "track_total_hits": True, 
                "query": {"bool": {"must": must_queries, "must_not": [{"exists": {"field": "deleted_at"}}]}}, 
                "sort": sort_body
            }
            try:
                res = self.client.search(index=index_name, body=body)
                return [hit["_source"] for hit in res.get("hits", {}).get("hits", [])]
            except: return []
        return await loop.run_in_executor(None, search)

    async def delete_user_panels(self, dashboard_id: str, user_id: str) -> bool:
        """사용자 전용 패널 설정 삭제"""
        loop = asyncio.get_event_loop()
        def delete():
            try:
                query = {"query": {"bool": {"must": [{"match": {"dashboard_id": dashboard_id}}, {"match": {"user_id": user_id}}]}}}
                self.client.delete_by_query(index="cs_dashboards", body=query, refresh=True)
                return True
            except: return False
        return await loop.run_in_executor(None, delete)
