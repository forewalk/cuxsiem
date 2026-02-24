"""대시보드 Service"""
import asyncio
from datetime import datetime
from typing import List, Optional, Dict, Any
from app.repositories.dashboard import DashboardRepository
from app.schemas.dashboard import (
    DashboardStatsResponse, 
    HistogramItem, 
    SeverityStat,
    DashboardSummary
)

class DashboardService:
    def __init__(self):
        self.repository = DashboardRepository()

    async def get_indices(self) -> List[str]: return await self.repository.get_indices()
    async def get_fields(self, index_name: str) -> List[dict]: return await self.repository.get_field_mappings(index_name)
    async def get_logs(self, dashboard_id: str = "threat-status", **kwargs) -> List[dict]:
        index_map = {"threat-status": "logs-sentinel_one.threats", "agent-dashboard": "logs-sentinel_one.agents"}
        return await self.repository.get_logs(index_map.get(dashboard_id, "logs-sentinel_one.threats"), **kwargs)

    async def get_dashboard_stats(
        self, dashboard_id: str = "threat-status", from_value=None, from_unit=None, to_value=None, to_unit=None, from_date=None, to_date=None, query=None
    ) -> DashboardStatsResponse:
        index_map = {"threat-status": "logs-sentinel_one.threats", "agent-dashboard": "logs-sentinel_one.agents"}
        target_index = index_map.get(dashboard_id, "logs-sentinel_one.threats")

        # 1. 패널 설정 조회
        panels_raw = await self.repository.get_panels(dashboard_id)
        
        # 2. 통계 데이터 조회 (동적 패널 기능을 잠시 비활성화하고 정적으로 조회)
        raw_data = await self.repository.get_stats(target_index, from_value, from_unit, to_value, to_unit, from_date, to_date, query)
        
        aggs = raw_data.get("aggregations", {})
        total_hits = raw_data.get("hits", {}).get("total", {}).get("value", 0)
        
        def get_buckets(agg_key): return aggs.get(agg_key, {}).get("buckets", [])
        def get_doc_count(agg_key): return aggs.get(agg_key, {}).get("doc_count", 0)

        histogram = [HistogramItem(timestamp=datetime.fromtimestamp(b["key"]/1000.0), count=b["doc_count"]) for b in get_buckets("logs_over_time")]

        summary = DashboardSummary(
            total_logs=total_hits, total_threats=total_hits,
            resolved_threats=get_doc_count("resolved_count"), unresolved_threats=get_doc_count("unresolved_count"),
            active_threats=get_doc_count("active_count"), blocked_threats=get_doc_count("blocked_count"),
            mitigated_threats=get_doc_count("mitigated_count"), suspicious_threats=get_doc_count("suspicious_count")
        )

        def map_stats(agg_key): return [SeverityStat(label=str(b["key"]), value=b["doc_count"]) for b in get_buckets(agg_key)]

        return DashboardStatsResponse(
            summary=summary, histogram=histogram,
            detection_stats=map_stats("detection_engines"), prevalent_threats=map_stats("prevalent_threats"),
            agent_status_stats=map_stats("agent_status"), mitigation_stats=map_stats("mitigation_status"),
            severity_stats=map_stats("severity_dist"),
            agent_os_dist=map_stats("agent_os_dist"), agent_version_dist=map_stats("agent_version_dist"), agent_scan_status=map_stats("agent_scan_status"),
            panels=panels_raw, last_updated=datetime.utcnow()
        )

    async def update_panel_settings(self, dashboard_id: str, panel_key: str, title=None, language=None, grid_width=None, grid_height=None, custom_query=None) -> bool:
        update_data = {"updated_at": datetime.utcnow().isoformat()}
        if title and language: update_data[f"custom_titles.{language}"] = title
        if grid_width: update_data["grid_width"] = grid_width
        if grid_height: update_data["grid_height"] = grid_height
        if custom_query is not None: update_data["custom_query"] = custom_query
        return await self.repository.update_panel(dashboard_id, panel_key, update_data)

    async def save_dashboard_layout(self, dashboard_id: str, panels: List[Dict[str, Any]]) -> bool:
        updates = []
        for p in panels:
            updates.append({"panel_key": p["panel_key"], "custom_titles": p.get("custom_titles", {}), "grid_width": p.get("grid_width"), "grid_height": p.get("grid_height"), "custom_query": p.get("custom_query"), "display_order": p.get("display_order", 0)})
        return await self.repository.bulk_update_panels(dashboard_id, updates)

    async def reset_dashboard_settings(self, dashboard_id: str) -> bool:
        default_config = {
            "threat-status": [{"key": "total_threats", "w": 4, "h": 120, "order": 1}, {"key": "unresolved_threats", "w": 4, "h": 120, "order": 2}, {"key": "resolved_threats", "w": 4, "h": 120, "order": 3}, {"key": "active_threats", "w": 4, "h": 120, "order": 4}, {"key": "blocked_threats", "w": 3, "h": 120, "order": 5}, {"key": "mitigated_threats", "w": 3, "h": 120, "order": 6}, {"key": "suspicious_threats", "w": 3, "h": 120, "order": 7}, {"key": "detection_engine", "w": 2, "h": 380, "order": 8}, {"key": "severity_dist", "w": 2, "h": 380, "order": 9}, {"key": "prevalent_threats", "w": 3, "h": 380, "order": 10}, {"key": "mitigation_stats", "w": 3, "h": 380, "order": 11}, {"key": "agent_status_dist", "w": 3, "h": 380, "order": 12}],
            "agent-dashboard": [{"key": "total_agents", "w": 4, "h": 120, "order": 1}, {"key": "active_agents", "w": 4, "h": 120, "order": 2}, {"key": "inactive_agents", "w": 4, "h": 120, "order": 3}, {"key": "infected_agents", "w": 4, "h": 120, "order": 4}, {"key": "agent_os_dist", "w": 2, "h": 380, "order": 5}, {"key": "agent_version_dist", "w": 2, "h": 380, "order": 6}, {"key": "agent_scan_status", "w": 1, "h": 300, "order": 7}]
        }
        panels = default_config.get(dashboard_id, [])
        if not panels: return False
        updates = [{"panel_key": p["key"], "grid_width": p["w"], "grid_height": p["h"], "display_order": p["order"], "custom_titles": {}, "custom_query": None} for p in panels]
        return await self.repository.bulk_update_panels(dashboard_id, updates)
