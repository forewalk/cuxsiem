"""대시보드 Service"""
from datetime import datetime
from typing import List, Optional
from app.repositories.dashboard import DashboardRepository
from app.schemas.dashboard import (
    DashboardStatsResponse, 
    HistogramItem, 
    DashboardSummary
)

class DashboardService:
    def __init__(self):
        self.repository = DashboardRepository()

    async def get_indices(self) -> List[str]:
        return await self.repository.get_indices()

    async def get_dashboard_stats(
        self, 
        from_value: Optional[int] = None, 
        from_unit: Optional[str] = None,
        to_value: Optional[int] = None,
        to_unit: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        query: str = None
    ) -> DashboardStatsResponse:
        raw_data = await self.repository.get_stats(from_value, from_unit, to_value, to_unit, from_date, to_date, query)
        aggs = raw_data.get("aggregations", {})
        total_hits = raw_data.get("hits", {}).get("total", {}).get("value", 0)
        
        histogram = []
        for bucket in aggs.get("logs_over_time", {}).get("buckets", []):
            histogram.append(HistogramItem(
                timestamp=datetime.fromtimestamp(bucket["key"] / 1000.0),
                count=bucket["doc_count"]
            ))

        summary = DashboardSummary(
            total_logs=total_hits,
            total_threats=total_hits,
            resolved_threats=aggs.get("resolved_count", {}).get("doc_count", 0),
            unresolved_threats=aggs.get("unresolved_count", {}).get("doc_count", 0),
            active_threats=aggs.get("active_count", {}).get("doc_count", 0),
            blocked_threats=aggs.get("blocked_count", {}).get("doc_count", 0),
            mitigated_threats=aggs.get("mitigated_count", {}).get("doc_count", 0),
            suspicious_threats=aggs.get("suspicious_count", {}).get("doc_count", 0)
        )

        return DashboardStatsResponse(
            summary=summary,
            histogram=histogram,
            severity_stats=[],
            last_updated=datetime.utcnow()
        )
