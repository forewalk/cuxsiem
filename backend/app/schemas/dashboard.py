from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class HistogramItem(BaseModel):
    timestamp: datetime
    count: int

class SeverityStat(BaseModel):
    label: str
    value: int

class DashboardSummary(BaseModel):
    total_logs: int = 0
    total_threats: int = 0
    resolved_threats: int = 0
    unresolved_threats: int = 0
    active_threats: int = 0
    blocked_threats: int = 0
    mitigated_threats: int = 0
    suspicious_threats: int = 0

class DashboardPanel(BaseModel):
    dashboard_id: str
    panel_key: str
    custom_titles: Dict[str, str] = {}
    default_title_key: str = ""
    grid_width: int = 4
    grid_height: int = 120
    custom_query: Optional[str] = None
    default_query: Optional[str] = None
    widget_type: str = "metric"      # 추가: metric, bar, pie
    target_field: Optional[str] = None # 추가: 집계 대상 필드
    current_value: int = 0           # 추가: 실시간 값 (metric용)
    chart_data: List[SeverityStat] = [] # 추가: 실시간 데이터 (chart용)
    is_visible: bool = True
    display_order: int = 0
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class DashboardStatsResponse(BaseModel):
    summary: DashboardSummary
    histogram: List[HistogramItem] = []
    severity_stats: List[SeverityStat] = []
    detection_stats: List[SeverityStat] = []
    prevalent_threats: List[SeverityStat] = []
    agent_status_stats: List[SeverityStat] = []
    mitigation_stats: List[SeverityStat] = []
    mitigation_mode_stats: List[SeverityStat] = []
    confidence_level_stats: List[SeverityStat] = []
    file_extension_stats: List[SeverityStat] = []
    incident_status_stats: List[SeverityStat] = []
    threat_technique_stats: List[SeverityStat] = []
    infected_agent_stats: List[SeverityStat] = []
    agent_os_dist: List[SeverityStat] = []
    agent_version_dist: List[SeverityStat] = []
    agent_scan_status: List[SeverityStat] = []
    panels: List[DashboardPanel] = []
    last_updated: datetime = Field(default_factory=datetime.utcnow)

class DashboardPanelUpdate(BaseModel):
    title: Optional[str] = None
    language: Optional[str] = None
    grid_width: Optional[int] = None
    grid_height: Optional[int] = None
    custom_query: Optional[str] = None
    widget_type: Optional[str] = None
    target_field: Optional[str] = None
    display_order: Optional[int] = None
