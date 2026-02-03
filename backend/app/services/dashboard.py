"""대시보드 Service"""
from datetime import datetime
from typing import List, Optional
from app.repositories.dashboard import DashboardRepository
from app.schemas.dashboard import (
    DashboardStatsResponse, 
    HistogramItem, 
    SeverityStat, 
    DashboardSummary
)

class DashboardService:
    """대시보드 데이터 가공 비즈니스 로직"""

    def __init__(self):
        self.repository = DashboardRepository()

    async def get_indices(self) -> List[str]:
        return await self.repository.get_indices()

    async def get_dashboard_stats(self, index_name: str = None, time_range: str = "15m", query: str = None) -> DashboardStatsResponse:
        """통계 데이터를 가져와서 스키마 형식으로 변환"""
        raw_data = await self.repository.get_stats(index_name, time_range, query)
        aggs = raw_data.get("aggregations", {})
        
        histogram = []
        for bucket in aggs.get("logs_over_time", {}).get("buckets", []):
            histogram.append(HistogramItem(
                timestamp=datetime.fromtimestamp(bucket["key"] / 1000.0),
                count=bucket["doc_count"]
            ))

        severity_stats = []
        for bucket in aggs.get("severity_stats", {}).get("buckets", []):
            severity_stats.append(SeverityStat(
                label=bucket["key"],
                value=bucket["doc_count"]
            ))

        summary = DashboardSummary(
            total_logs=raw_data.get("hits", {}).get("total", {}).get("value", 0),
            critical_logs=aggs.get("critical_count", {}).get("doc_count", 0),
            warning_logs=aggs.get("warning_count", {}).get("doc_count", 0)
        )

        return DashboardStatsResponse(
            summary=summary,
            histogram=histogram,
            severity_stats=severity_stats,
            last_updated=datetime.utcnow()
        )
