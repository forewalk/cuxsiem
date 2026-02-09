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
                # (fromisoformat이 실패하는 특정 패턴 대응)
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
        mitigation_field = "threatInfo.mitigationStatus"

        now = datetime.utcnow()
        
        # 시작 시간 결정
        start_time = self._parse_iso_date(from_date)
        if start_time:
            # 시간대 정보가 있으면 제거하여 naive UTC로 변환
            start_time = start_time.replace(tzinfo=None)
        else:
            if from_value is not None and from_unit:
                start_time = now - self._parse_time(from_value, from_unit)
            else:
                start_time = now - timedelta(minutes=15)

        # 종료 시간 결정
        end_time = self._parse_iso_date(to_date)
        if end_time:
            # 시간대 정보가 있으면 제거하여 naive UTC로 변환
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
                    "suspicious_count": {"filter": {"term": {severity_field: "suspicious"}}}
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