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
    # Threats Row 1
    total_threats: int = 0
    resolved_threats: int = 0
    unresolved_threats: int = 0
    active_threats: int = 0
    # Threats Row 2
    blocked_threats: int = 0
    mitigated_threats: int = 0
    suspicious_threats: int = 0

class DashboardStatsResponse(BaseModel):
    summary: DashboardSummary
    histogram: List[HistogramItem]
    severity_stats: List[SeverityStat]
    detection_stats: List[SeverityStat] = []
    prevalent_threats: List[SeverityStat] = []
    mitigation_stats: List[SeverityStat] = []
    last_updated: datetime