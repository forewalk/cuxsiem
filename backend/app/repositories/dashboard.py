"""대시보드 Repository"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from app.core.opensearch import get_opensearch_client

class DashboardRepository:
    """대시보드 통계 데이터 조회"""

    def __init__(self):
        self.client = get_opensearch_client()
        self.fixed_index = "logs-sentinel_one.threats"

    async def get_indices(self) -> List[str]:
        return [self.fixed_index]

    def _parse_time(self, value: int, unit: str) -> timedelta:
        if unit == "m": return timedelta(minutes=value)
        if unit == "h": return timedelta(hours=value)
        if unit == "d": return timedelta(days=value)
        return timedelta(minutes=15)

    async def get_stats(
        self, 
        from_value: int = 15, 
        from_unit: str = "m", 
        to_value: Optional[int] = None, 
        to_unit: Optional[str] = None, 
        query: str = None
    ) -> Dict[str, Any]:
        """지정된 시작/종료 기간과 검색 쿼리에 따른 통계 데이터 조회"""
        loop = asyncio.get_event_loop()
        target_index = self.fixed_index
        time_field = "@timestamp"
        status_field = "threatInfo.incidentStatus"
        severity_field = "threatInfo.confidenceLevel"
        mitigation_field = "mitigationStatus"

        now = datetime.utcnow()
        start_time = now - self._parse_time(from_value, from_unit)
        
        # 종료 시간 설정 (to_value가 있으면 계산, 없으면 현재 시간)
        if to_value is not None and to_unit:
            end_time = now - self._parse_time(to_value, to_unit)
        else:
            end_time = now

        # 집계 간격(Interval) 자동 계산 (더 촘촘하게 조정)
        duration = end_time - start_time
        seconds = duration.total_seconds()
        if seconds <= 3600: # 1시간 이내
            interval = "1m" 
        elif seconds <= 86400: # 1일 이내
            interval = "30m" 
        elif seconds <= 86400 * 7: # 1주일 이내
            interval = "2h"
        elif seconds <= 86400 * 31: # 한달 이내
            interval = "6h" 
        else:
            interval = "1d"

        def search():
            must_queries = [{"range": {time_field: {"gte": start_time.isoformat(), "lte": end_time.isoformat()}}}]
            if query and query.strip():
                must_queries.append({"query_string": {"query": query, "analyze_wildcard": True, "default_operator": "AND"}})

            body = {
                "size": 0,
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
                    "resolved_count": {"filter": {"terms": {status_field: ["resolved", "resolved"]}}},
                    "unresolved_count": {"filter": {"terms": {status_field: ["unresolved", "unresolved"]}}},
                    "active_count": {
                        "filter": {
                            "bool": {
                                "must": [
                                    {"terms": {status_field: ["resolved", "resolved"]}},
                                    {"terms": {"threatInfo.mitigationStatus": ["active", "active"]}}
                                ]
                            }
                        }
                    },
                    "blocked_count": {"filter": {"terms": {mitigation_field: ["blocked", "blocked"]}}},
                    "mitigated_count": {"filter": {"terms": {mitigation_field: ["mitigated", "mitigated"]}}},
                    "suspicious_count": {"filter": {"terms": {severity_field: ["suspicious", "suspicious"]}}}
                }
            }
            
            try:
                return self.client.search(index=target_index, body=body)
            except Exception as e:
                print(f"OpenSearch Error ({target_index}): {e}")
                return {"hits": {"total": {"value": 0}}, "aggregations": {}}

        return await loop.run_in_executor(None, search)