"""대시보드 Repository"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List

from app.core.opensearch import get_opensearch_client

class DashboardRepository:
    """대시보드 통계 데이터 조회"""

    def __init__(self):
        self.client = get_opensearch_client()
        # 기본 인덱스 설정
        self.default_index = "activities"

    async def get_indices(self) -> List[str]:
        """사용 가능한 로그 인덱스 목록 (하드코딩)"""
        return ["activities", "edr", "threats"]

    async def get_stats(self, index_name: str = None, time_range: str = "15m", query: str = None) -> Dict[str, Any]:
        """지정된 인덱스, 기간, 검색 쿼리에 따른 통계 데이터 조회"""
        loop = asyncio.get_event_loop()
        
        target_index = index_name or self.default_index
        
        # 필드명 매핑 (실제 데이터 기반 업데이트)
        # activities, edr, threats 모두 timestamp 또는 @timestamp를 사용함
        # OpenSearch 쿼리에서 필드 존재 여부를 자동으로 판단하기 어렵다면, 
        # 주로 사용되는 두 필드 모두에 대해 range 쿼리를 or 조건으로 날리거나 대표 필드 지정
        time_field = "timestamp" # edr, activities는 timestamp, threats는 @timestamp 사용 확인됨
        if target_index in ["threats", "edr"]:
            time_field = "@timestamp"

        # 심각도 필드 매핑
        severity_field = "severity.keyword"
        if target_index == "threats":
            severity_field = "threatInfo.confidenceLevel.keyword"
        elif target_index == "edr":
            severity_field = "event.category.keyword"

        # 기간 계산
        now = datetime.utcnow()
        if time_range == "15m":
            start_time = now - timedelta(minutes=15)
            interval = "1m"
        elif time_range == "1h":
            start_time = now - timedelta(hours=1)
            interval = "5m"
        elif time_range == "24h":
            start_time = now - timedelta(hours=24)
            interval = "1h"
        elif time_range == "48h":
            start_time = now - timedelta(hours=48)
            interval = "2h"
        else:
            start_time = now - timedelta(minutes=15)
            interval = "1m"

        def search():
            # 1. 필터 조건
            must_queries = [
                {"range": {time_field: {"gte": start_time.isoformat()}}}
            ]
            
            # 2. 검색어
            if query and query.strip():
                must_queries.append({
                    "query_string": {
                        "query": query,
                        "analyze_wildcard": True,
                        "default_operator": "AND"
                    }
                })

            body = {
                "size": 0,
                "query": {
                    "bool": {
                        "must": must_queries,
                        "must_not": [
                            {"exists": {"field": "deleted_at"}}
                        ]
                    }
                },
                "aggs": {
                    "logs_over_time": {
                        "date_histogram": {
                            "field": time_field,
                            "fixed_interval": interval,
                            "extended_bounds": {
                                "min": start_time.isoformat(),
                                "max": now.isoformat()
                            }
                        }
                    },
                    "severity_stats": {
                        "terms": {
                            "field": severity_field,
                            "missing": "unknown"
                        }
                    },
                    "critical_count": {
                        "filter": {
                            "bool": {
                                "should": [
                                    {"term": {severity_field: "critical"}},
                                    {"term": {severity_field: "high"}},
                                    {"term": {severity_field: "suspicious"}}
                                ]
                            }
                        }
                    },
                    "warning_count": {
                        "filter": {
                            "bool": {
                                "should": [
                                    {"term": {severity_field: "warning"}},
                                    {"term": {severity_field: "medium"}}
                                ]
                            }
                        }
                    }
                }
            }
            
            try:
                return self.client.search(index=target_index, body=body)
            except Exception as e:
                print(f"OpenSearch Error ({target_index} on {time_field}): {e}")
                return {"hits": {"total": {"value": 0}}, "aggregations": {}}

        return await loop.run_in_executor(None, search)
