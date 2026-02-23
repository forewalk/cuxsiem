"""대시보드 Repository"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from app.core.opensearch import get_opensearch_client

class DashboardRepository:
    """대시보드 통계 데이터 조회"""

    def __init__(self):
        self.client = get_opensearch_client()
        # 기본 인덱스 설정
        self.fixed_index = "logs-sentinel_one.threats"

    async def get_indices(self) -> List[str]:
        return [self.fixed_index]

    async def get_field_mappings(self, index_name: str) -> List[Dict[str, str]]:
        """인덱스의 필드 목록 및 타입 조회"""
        loop = asyncio.get_event_loop()
        
        def get_mapping():
            try:
                print(f"DEBUG: Fetching mapping for index: {index_name}")
                if not self.client.indices.exists(index=index_name):
                    print(f"DEBUG: Index {index_name} does not exist!")
                    return []

                mapping = self.client.indices.get_mapping(index=index_name)
                # 인덱스명이 와일드카드 패턴일 경우 여러 개가 올 수 있으므로 첫 번째를 사용
                actual_index = list(mapping.keys())[0] if mapping else None
                if not actual_index:
                    return []

                properties = mapping.get(actual_index, {}).get("mappings", {}).get("properties", {})
                print(f"DEBUG: Found {len(properties)} top-level properties for {actual_index}")
                
                fields = []
                def extract_fields(props, prefix=""):
                    for field_name, info in props.items():
                        full_name = f"{prefix}{field_name}"
                        if "properties" in info:
                            extract_fields(info["properties"], f"{full_name}.")
                        else:
                            fields.append({
                                "name": full_name,
                                "type": info.get("type", "text")
                            })
                
                extract_fields(properties)
                print(f"DEBUG: Total fields extracted: {len(fields)}")
                # 이름순 정렬
                return sorted(fields, key=lambda x: x["name"])
            except Exception as e:
                import traceback
                print(f"ERROR: Exception in get_mapping for {index_name}")
                traceback.print_exc()
                return []

        return await loop.run_in_executor(None, get_mapping)

    def _parse_time(self, value: int, unit: str) -> timedelta:
        if unit == "m": return timedelta(minutes=value)
        if unit == "h": return timedelta(hours=value)
        if unit == "d": return timedelta(days=value)
        return timedelta(minutes=15)

    def _parse_iso_date(self, date_str: Optional[str]) -> Optional[datetime]:
        if not date_str:
            return None
        try:
            # 1. 'Z'를 UTC 오프셋으로 변경
            clean_date = date_str.replace("Z", "+00:00")
            # 2. ISO 포맷 파싱
            return datetime.fromisoformat(clean_date)
        except Exception as e:
            try:
                # 3. 실패 시 밀리초 등 복잡한 형식 대응을 위해 더 유연한 파싱 시도
                import dateutil.parser
                return dateutil.parser.isoparse(date_str)
            except:
                print(f"CRITICAL: Date parsing failed for {date_str}: {e}")
                return None

    async def get_stats(
        self, 
        from_value: Optional[int] = None, 
        from_unit: Optional[str] = None, 
        to_value: Optional[int] = None, 
        to_unit: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        query: str = None
    ) -> Dict[str, Any]:
        loop = asyncio.get_event_loop()
        target_index = self.fixed_index
        time_field = "@timestamp"
        status_field = "threatInfo.incidentStatus"
        severity_field = "threatInfo.confidenceLevel"
        mitigation_field = "mitigationStatus"

        now = datetime.utcnow()
        
        # 시작 시간 결정
        start_time = self._parse_iso_date(from_date)
        if start_time:
            start_time = start_time.replace(tzinfo=None)
        else:
            if from_value is not None and from_unit:
                start_time = now - self._parse_time(from_value, from_unit)
            else:
                start_time = now - timedelta(minutes=15)

        # 종료 시간 결정
        end_time = self._parse_iso_date(to_date)
        if end_time:
            end_time = end_time.replace(tzinfo=None)
        else:
            if to_value is not None and to_unit:
                end_time = now - self._parse_time(to_value, to_unit)
            else:
                end_time = now

        # 시작/종료 역전 방지
        if start_time > end_time:
            start_time, end_time = end_time, start_time

        # 집계 간격(Interval) 자동 계산
        duration = end_time - start_time
        seconds = duration.total_seconds()
        if seconds <= 3600: interval = "1m"
        elif seconds <= 86400: interval = "30m"
        elif seconds <= 86400 * 7: interval = "2h"
        elif seconds <= 86400 * 31: interval = "6h"
        else: interval = "1d"

        def search():
            must_queries = [{"range": {time_field: {"gte": start_time.isoformat(), "lte": end_time.isoformat()}}}]
            if query and query.strip():
                must_queries.append({"query_string": {"query": query, "analyze_wildcard": True, "default_operator": "AND"}})

            body = {
                "size": 0,
                "track_total_hits": True, # 10,000건 제한 해제
                "query": {
                    "bool": {
                        "must": must_queries,
                        "must_not": [{"exists": {"field": "deleted_at"}}]
                    }
                },
                "aggs": {
                    "logs_over_time": {
                        "date_histogram": {
                            "field": time_field,
                            "fixed_interval": interval,
                            "extended_bounds": {"min": start_time.isoformat(), "max": end_time.isoformat()}
                        }
                    },
                    "resolved_count": {"filter": {"term": {status_field: "resolved"}}},
                    "unresolved_count": {"filter": {"term": {status_field: "unresolved"}}},
                    "active_count": {
                        "filter": {
                            "bool": {
                                "must": [
                                    {"term": {status_field: "resolved"}},
                                    {"term": {mitigation_field: "active"}}
                                ]
                            }
                        }
                    },
                    "blocked_count": {
                        "filter": {
                            "bool": {
                                "must": [
                                    {"term": {status_field: "unresolved"}},
                                    {"term": {mitigation_field: "blocked"}}
                                ]
                            }
                        }
                    },
                    "mitigated_count": {
                        "filter": {
                            "bool": {
                                "must": [
                                    {"term": {status_field: "unresolved"}},
                                    {"term": {mitigation_field: "mitigated"}}
                                ]
                            }
                        }
                    },
                    "suspicious_count": {"filter": {"term": {severity_field: "suspicious"}}},
                    "detection_engines": {
                        "terms": {
                            "field": "threatInfo.detectionEngines.title",
                            "size": 10
                        }
                    },
                    "prevalent_threats": {
                        "terms": {
                            "field": "threatInfo.threatName",
                            "size": 10
                        }
                    },
                    "mitigation_status_dist": {
                        "terms": {
                            "field": "threatInfo.mitigationStatus",
                            "size": 10
                        }
                    }
                }
            }
            
            try:
                return self.client.search(index=target_index, body=body)
            except Exception as e:
                import traceback
                print(f"OpenSearch Search Error: {e}")
                traceback.print_exc()
                return {"hits": {"total": {"value": 0}}, "aggregations": {}}

        return await loop.run_in_executor(None, search)

    async def get_logs(
        self, 
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        from_value: Optional[int] = None,
        from_unit: Optional[str] = None,
        to_value: Optional[int] = None,
        to_unit: Optional[str] = None,
        query: str = None,
        size: int = 20,
        offset: int = 0,
        sort_order: str = "desc"
    ) -> List[Dict[str, Any]]:
        """로그 데이터 목록 조회"""
        loop = asyncio.get_event_loop()
        target_index = self.fixed_index
        time_field = "@timestamp"
        
        now = datetime.utcnow()
        start_time = self._parse_iso_date(from_date) or (now - self._parse_time(from_value or 15, from_unit or "m"))
        end_time = self._parse_iso_date(to_date) or (now - self._parse_time(to_value or 0, to_unit or "m") if to_value else now)

        def search():
            must_queries = [{"range": {time_field: {"gte": start_time.isoformat(), "lte": end_time.isoformat()}}}]
            if query and query.strip():
                must_queries.append({"query_string": {"query": query, "analyze_wildcard": True, "default_operator": "AND"}})

            body = {
                "size": size,
                "from": offset,
                "track_total_hits": True, # 10,000건 제한 해제
                "query": {
                    "bool": {
                        "must": must_queries,
                        "must_not": [{"exists": {"field": "deleted_at"}}]
                    }
                },
                "sort": [{time_field: {"order": sort_order}}]
            }
            
            try:
                res = self.client.search(index=target_index, body=body)
                return [hit["_source"] for hit in res.get("hits", {}).get("hits", [])]
            except Exception as e:
                print(f"OpenSearch Log Search Error: {e}")
                return []

        return await loop.run_in_executor(None, search)
