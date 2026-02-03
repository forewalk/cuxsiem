from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime

class HistogramItem(BaseModel):
    timestamp: datetime
    count: int

class SeverityStat(BaseModel):
    label: str
    value: int

class DashboardSummary(BaseModel):
    total_logs: int
    critical_logs: int
    warning_logs: int

class DashboardStatsResponse(BaseModel):
    summary: DashboardSummary
    histogram: List[HistogramItem]
    severity_stats: List[SeverityStat]
    last_updated: datetime
