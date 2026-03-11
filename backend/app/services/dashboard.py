"""대시보드 Service"""
import asyncio
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from app.repositories.dashboard import DashboardRepository
from app.schemas.dashboard import (
    DashboardStatsResponse, 
    HistogramItem, 
    SeverityStat,
    DashboardSummary,
    DashboardPanel
)

class DashboardService:
    def __init__(self):
        self.repository = DashboardRepository()

    async def get_indices(self) -> List[str]: return await self.repository.get_indices()
    async def get_fields(self, index_name: str) -> List[dict]: return await self.repository.get_field_mappings(index_name)
    async def get_logs(self, dashboard_id: str = "threat-status", **kwargs) -> List[dict]:
        index_map = {
            "threat-status": "logs-sentinel_one.threats", 
            "agent-dashboard": "logs-sentinel_one.agents",
            "edr-dashboard": "logs-sentinel_one.edr"
        }
        index_name = index_map.get(dashboard_id, "logs-sentinel_one.threats")
        return await self.repository.get_logs(index_name, **kwargs)

    async def get_dashboard_stats(
        self, 
        dashboard_id: str = "threat-status", 
        from_value=None, from_unit=None, to_value=None, to_unit=None, from_date=None, to_date=None, 
        query=None,
        panels_override: List[Dict[str, Any]] = None # 추가: 외부에서 패널 설정 주입 가능
    ) -> DashboardStatsResponse:
        index_map = {
            "threat-status": "logs-sentinel_one.threats", 
            "agent-dashboard": "logs-sentinel_one.agents",
            "edr-dashboard": "logs-sentinel_one.edr"
        }
        target_index = index_map.get(dashboard_id, "logs-sentinel_one.threats")

        # 1. 패널 설정 결정 (오버라이드 있으면 그것 사용, 없으면 DB 조회)
        if dashboard_id == "edr-dashboard" and panels_override is None:
            panels_raw = [{"dashboard_id": "edr-dashboard", "panel_key": "edr_event_categories", "widget_type": "bar", "target_field": "event.category"}]
        elif panels_override is not None:
            panels_raw = panels_override
        else:
            panels_raw = await self.repository.get_panels(dashboard_id)
        
        # 필드 타입 정보 가져오기 (불리언 필드 판별용)
        field_mappings = await self.repository.get_field_mappings(target_index)
        bool_fields = {f["name"] for f in field_mappings if f["type"] == "boolean"}
        
        # 시스템 기본 쿼리 매핑
        default_queries = {
            "resolved_threats": 'threatInfo.incidentStatus: "resolved"',
            "unresolved_threats": 'threatInfo.incidentStatus: "unresolved"',
            "active_threats": '(threatInfo.incidentStatus: "resolved") AND (threatInfo.mitigationStatus: "active")',
            "blocked_threats": '(!threatInfo.incidentStatus: "resolved") AND (threatInfo.mitigationStatus: "blocked")',
            "mitigated_threats": '(threatInfo.mitigationStatus: "mitigated") AND (!threatInfo.incidentStatus: "resolved")',
            "suspicious_threats": '(threatInfo.incidentStatus: "resolved") AND (threatInfo.mitigationStatus: "active")',
            "active_agents": 'isActive: true',
            "inactive_agents": 'isActive: false',
            "infected_agents": 'infected: true'
        }

        for p in panels_raw:
            if p["panel_key"] in default_queries:
                p["default_query"] = default_queries[p["panel_key"]]
            elif "default_query" not in p or not p["default_query"]:
                p["default_query"] = "*"

        # 2. 통계 데이터 조회 (동적 집계 포함)
        raw_data = await self.repository.get_stats(target_index, panels_raw, from_value, from_unit, to_value, to_unit, from_date, to_date, query)
        
        aggs = raw_data.get("aggregations", {})
        total_hits = raw_data.get("hits", {}).get("total", {}).get("value", 0)
        
        def get_buckets(agg_key):
            node = aggs.get(agg_key, {})
            if "inner" in node: return node["inner"].get("buckets", [])
            return node.get("buckets", [])

        def get_doc_count(agg_key):
            node = aggs.get(agg_key, {})
            # filter 집계인 경우 doc_count가 직접 있고, 
            # 커스텀 쿼리로 인해 래핑된 경우에도 top-level doc_count를 사용하면 됨
            if "doc_count" in node: return node["doc_count"]
            # 만약 래핑되지 않은 terms 집계에서 호출되었다면 sum(buckets)를 반환 (안전장치)
            buckets = node.get("buckets", [])
            if buckets: return sum(b.get("doc_count", 0) for b in buckets)
            return 0

        histogram = [HistogramItem(timestamp=datetime.fromtimestamp(b["key"]/1000.0, tz=timezone.utc), count=b["doc_count"]) 
                     for b in get_buckets("logs_over_time")]

        summary = DashboardSummary(
            total_logs=total_hits,
            total_threats=get_doc_count("total_threats") or total_hits,
            resolved_threats=get_doc_count("resolved_threats"),
            unresolved_threats=get_doc_count("unresolved_threats"),
            active_threats=get_doc_count("active_threats"),
            blocked_threats=get_doc_count("blocked_threats"),
            mitigated_threats=get_doc_count("mitigated_threats"),
            suspicious_threats=get_doc_count("suspicious_threats")
        )

        # 동적 패널 데이터 매핑 (실시간 값 주입)
        processed_panels = []
        for p in panels_raw:
            pk = p["panel_key"]
            t_field = p.get("target_field")
            is_bool = t_field in bool_fields
            
            p["current_value"] = get_doc_count(pk) if p.get("widget_type") == "metric" else 0
            
            chart_buckets = get_buckets(pk)
            chart_data = []
            for b in chart_buckets:
                label = str(b["key"])
                if is_bool:
                    if label == "1" or label.lower() == "true": label = "true"
                    elif label == "0" or label.lower() == "false": label = "false"
                chart_data.append(SeverityStat(label=label, value=b["doc_count"]))
            
            p["chart_data"] = chart_data if p.get("widget_type") != "metric" else []
            processed_panels.append(DashboardPanel(**p))

        def map_stats(agg_key):
            # 기본 집계 결과도 불리언 처리가 필요한지 확인 (예: agent_status_dist 등은 보통 문자열 필드)
            return [SeverityStat(label=str(b["key"]), value=b["doc_count"]) for b in get_buckets(agg_key)]

        return DashboardStatsResponse(
            summary=summary,
            histogram=histogram,
            detection_stats=map_stats("detection_engine"), 
            prevalent_threats=map_stats("prevalent_threats"),
            agent_status_stats=map_stats("agent_status_dist"), 
            mitigation_stats=map_stats("mitigation_stats"),
            severity_stats=map_stats("severity_dist"),
            agent_os_dist=map_stats("agent_os_dist"), 
            agent_version_dist=map_stats("agent_version_dist"), 
            agent_scan_status=map_stats("agent_scan_status"),
            panels=processed_panels,
            last_updated=datetime.now(timezone.utc)
        )

    async def update_panel_settings(self, dashboard_id: str, panel_key: str, title=None, language=None, grid_width=None, grid_height=None, custom_query=None, widget_type=None, target_field=None) -> bool:
        update_data: Dict[str, Any] = {"updated_at": datetime.utcnow().isoformat()}
        if title and language: update_data[f"custom_titles.{language}"] = title
        if grid_width: update_data["grid_width"] = grid_width
        if grid_height: update_data["grid_height"] = grid_height
        if custom_query is not None: update_data["custom_query"] = custom_query
        if widget_type: update_data["widget_type"] = widget_type
        if target_field: update_data["target_field"] = target_field
        return await self.repository.update_panel(dashboard_id, panel_key, update_data)

    async def save_dashboard_layout(self, dashboard_id: str, panels: List[Dict[str, Any]]) -> bool:
        updates = []
        for p in panels:
            updates.append({
                "panel_key": p["panel_key"], 
                "custom_titles": p.get("custom_titles", {}),
                "default_title_key": p.get("default_title_key", ""),
                "grid_width": p.get("grid_width"), 
                "grid_height": p.get("grid_height"),
                "custom_query": p.get("custom_query"), 
                "widget_type": p.get("widget_type", "metric"),
                "target_field": p.get("target_field"), 
                "display_order": p.get("display_order", 0)
            })
        return await self.repository.bulk_update_panels(dashboard_id, updates)

    async def reset_dashboard_settings(self, dashboard_id: str) -> bool:
        """대시보드 설정 초기화 (이름, 비율 기반 크기, 차트 타입 보존)"""
        default_config = {
            "threat-status": [
                {"key": "total_threats", "def": "totalThreats", "w": 4, "h": 120, "order": 1, "type": "metric"},
                {"key": "resolved_threats", "def": "resolvedThreats", "w": 4, "h": 120, "order": 2, "type": "metric"},
                {"key": "unresolved_threats", "def": "unresolvedThreats", "w": 4, "h": 120, "order": 3, "type": "metric"},
                {"key": "active_threats", "def": "activeThreats", "w": 4, "h": 120, "order": 4, "type": "metric"},
                {"key": "blocked_threats", "def": "blockedThreats", "w": 3, "h": 120, "order": 5, "type": "metric"},
                {"key": "mitigated_threats", "def": "mitigatedThreats", "w": 3, "h": 120, "order": 6, "type": "metric"},
                {"key": "suspicious_threats", "def": "suspiciousThreats", "w": 3, "h": 120, "order": 7, "type": "metric"},
                {"key": "detection_engine", "w": 2, "h": 380, "order": 8, "type": "pie", "field": "threatInfo.detectionEngines.title", "def": "detectionEngine"},
                {"key": "severity_dist", "w": 2, "h": 380, "order": 9, "type": "pie", "field": "threatInfo.severity", "def": "severityDistribution"},
                {"key": "prevalent_threats", "w": 3, "h": 380, "order": 10, "type": "bar", "field": "threatInfo.threatName", "def": "prevalentThreats"},
                {"key": "mitigation_stats", "w": 3, "h": 380, "order": 11, "type": "bar", "field": "threatInfo.mitigationStatus", "def": "mitigationStatusDist"},
                {"key": "agent_status_dist", "w": 3, "h": 380, "order": 12, "type": "pie", "field": "agentRealtimeInfo.agentDetectionState", "def": "agentStatusDist"},
            ],
            "agent-dashboard": [
                {"key": "total_agents", "def": "totalAgents", "w": 4, "h": 120, "order": 1, "type": "metric"},
                {"key": "active_agents", "def": "activeAgents", "w": 4, "h": 120, "order": 2, "type": "metric"},
                {"key": "inactive_agents", "def": "inactiveAgents", "w": 4, "h": 120, "order": 3, "type": "metric"},
                {"key": "infected_agents", "def": "infectedAgents", "w": 4, "h": 120, "order": 4, "type": "metric"},
                {"key": "agent_os_dist", "w": 2, "h": 380, "order": 5, "type": "pie", "field": "osName", "def": "agentOSDistribution"},
                {"key": "agent_version_dist", "w": 2, "h": 380, "order": 6, "type": "bar", "field": "agentVersion", "def": "agentVersionDistribution"},
                {"key": "agent_scan_status", "w": 1, "h": 300, "order": 7, "type": "pie", "field": "scanStatus", "def": "agentScanStatus"},
            ]
        }
        panels = default_config.get(dashboard_id, [])
        if not panels: return False
        updates = []
        for p in panels:
            updates.append({
                "panel_key": p["key"], 
                "default_title_key": p["def"],
                "grid_width": p["w"], 
                "grid_height": p["h"], 
                "display_order": p["order"],
                "widget_type": p.get("type", "metric"), 
                "target_field": p.get("field"),
                "custom_titles": {}, 
                "custom_query": None
            })
        return await self.repository.bulk_update_panels(dashboard_id, updates)

    async def get_column_settings(self, view_id: str, user_id: str) -> List[str]:
        """사용자별 리스트 컬럼 순서 조회"""
        dashboard_id = f"list-columns-{view_id}"
        panels = await self.repository.get_panels(dashboard_id, user_id)
        if not panels: return []
        return [p["panel_key"] for p in panels]

    async def save_column_settings(self, view_id: str, user_id: str, columns: List[str]) -> bool:
        """사용자별 리스트 컬럼 순서 저장"""
        dashboard_id = f"list-columns-{view_id}"
        updates = []
        for i, col in enumerate(columns):
            updates.append({
                "panel_key": col,
                "display_order": i,
                "is_visible": True,
                "widget_type": "column"
            })
        return await self.repository.bulk_update_panels(dashboard_id, updates, user_id)

    async def reset_column_settings(self, view_id: str, user_id: str) -> bool:
        """사용자별 리스트 컬럼 설정 초기화"""
        dashboard_id = f"list-columns-{view_id}"
        return await self.repository.delete_user_panels(dashboard_id, user_id)
