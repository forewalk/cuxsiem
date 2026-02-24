import sys
import os
from datetime import datetime
from dotenv import load_dotenv

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(ROOT_DIR)
load_dotenv(os.path.join(ROOT_DIR, ".env"))

from app.core.opensearch import get_opensearch_client

def init_dashboard_index():
    client = get_opensearch_client()
    index_name = "cs_dashboards"

    mapping = {
        "mappings": {
            "properties": {
                "dashboard_id": {"type": "keyword"},
                "panel_key": {"type": "keyword"},
                "custom_titles": {"type": "object", "enabled": True},
                "default_title_key": {"type": "keyword"},
                "grid_width": {"type": "integer"}, 
                "grid_height": {"type": "integer"},
                "display_order": {"type": "integer"},
                "custom_query": {"type": "text"},
                "widget_type": {"type": "keyword"},
                "target_field": {"type": "keyword"},
                "updated_at": {"type": "date"}
            }
        }
    }

    if client.indices.exists(index=index_name):
        client.indices.delete(index=index_name)
    client.indices.create(index=index_name, body=mapping)

    # 위협 현황 패널 설정
    threat_panels = [
        {"key": "total_threats", "def": "totalThreats", "order": 1, "w": 4, "h": 120, "type": "metric"},
        {"key": "resolved_threats", "def": "resolvedThreats", "order": 2, "w": 4, "h": 120, "type": "metric"},
        {"key": "unresolved_threats", "def": "unresolvedThreats", "order": 3, "w": 4, "h": 120, "type": "metric"},
        {"key": "active_threats", "def": "activeThreats", "order": 3, "w": 4, "h": 120, "type": "metric"},
        {"key": "blocked_threats", "def": "blockedThreats", "order": 5, "w": 3, "h": 120, "type": "metric"},
        {"key": "mitigated_threats", "def": "mitigatedThreats", "order": 6, "w": 3, "h": 120, "type": "metric"},
        {"key": "suspicious_threats", "def": "suspiciousThreats", "order": 7, "w": 3, "h": 120, "type": "metric"},
        {"key": "detection_engine", "def": "detectionEngine", "order": 8, "w": 2, "h": 380, "type": "pie", "field": "threatInfo.detectionEngines.title"},
        {"key": "severity_dist", "def": "severityDistribution", "order": 9, "w": 2, "h": 380, "type": "pie", "field": "threatInfo.severity"},
        {"key": "prevalent_threats", "def": "prevalentThreats", "order": 10, "w": 3, "h": 380, "type": "bar", "field": "threatInfo.threatName"},
        {"key": "mitigation_stats", "def": "mitigationStatusDist", "order": 11, "w": 3, "h": 380, "type": "bar", "field": "threatInfo.mitigationStatus"},
        {"key": "agent_status_dist", "def": "agentStatusDist", "order": 12, "w": 3, "h": 380, "type": "pie", "field": "agentRealtimeInfo.agentDetectionState"},
    ]

    # 에이전트 패널 설정
    agent_panels = [
        {"key": "total_agents", "def": "totalAgents", "order": 1, "w": 4, "h": 120, "type": "metric"},
        {"key": "active_agents", "def": "activeAgents", "order": 2, "w": 4, "h": 120, "type": "metric"},
        {"key": "inactive_agents", "def": "inactiveAgents", "order": 3, "w": 4, "h": 120, "type": "metric"},
        {"key": "infected_agents", "def": "infectedAgents", "order": 4, "w": 4, "h": 120, "type": "metric"},
        {"key": "agent_os_dist", "def": "agentOSDistribution", "order": 5, "w": 2, "h": 380, "type": "pie", "field": "osName"},
        {"key": "agent_version_dist", "def": "agentVersionDistribution", "order": 6, "w": 2, "h": 380, "type": "bar", "field": "agentVersion"},
        {"key": "agent_scan_status", "def": "agentScanStatus", "order": 7, "w": 1, "h": 300, "type": "pie", "field": "scanStatus"},
    ]

    def index_panels(dashboard_id, panel_list):
        for p in panel_list:
            doc = {
                "dashboard_id": dashboard_id,
                "panel_key": p["key"],
                "custom_titles": {},
                "default_title_key": p["def"],
                "grid_width": p["w"],
                "grid_height": p["h"],
                "display_order": p["order"],
                "widget_type": p["type"],
                "target_field": p.get("field"),
                "custom_query": None,
                "updated_at": datetime.utcnow().isoformat()
            }
            client.index(index=index_name, id=f"{dashboard_id}_{p['key']}", body=doc)

    index_panels("threat-status", threat_panels)
    index_panels("agent-dashboard", agent_panels)
    print("인덱스 초기화 완료 (차트 타입 정보 포함)")

if __name__ == "__main__":
    init_dashboard_index()
