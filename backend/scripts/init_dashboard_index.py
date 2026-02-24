import sys
import os
from datetime import datetime
from dotenv import load_dotenv

# 프로젝트 루트 경로 추가 및 환경 변수 로드
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
                "custom_query": {"type": "text"}, # 추가: 패널별 커스텀 쿼리
                "updated_at": {"type": "date"}
            }
        }
    }

    if client.indices.exists(index=index_name):
        client.indices.delete(index=index_name)
    
    client.indices.create(index=index_name, body=mapping)
    print(f"인덱스 '{index_name}'을(를) 생성했습니다.")

    # grid_width는 이제 분모값 (1=100%, 2=50%, 3=33.3%, 4=25%)
    threat_panels = [
        {"key": "total_threats", "def": "totalThreats", "order": 1, "w": 4, "h": 120},
        {"key": "unresolved_threats", "def": "unresolvedThreats", "order": 2, "w": 4, "h": 120},
        {"key": "active_threats", "def": "activeThreats", "order": 3, "w": 4, "h": 120},
        {"key": "suspicious_threats", "def": "suspiciousThreats", "order": 4, "w": 4, "h": 120},
        {"key": "resolved_threats", "def": "resolvedThreats", "order": 5, "w": 3, "h": 120},
        {"key": "blocked_threats", "def": "blockedThreats", "order": 6, "w": 3, "h": 120},
        {"key": "mitigated_threats", "def": "mitigatedThreats", "order": 7, "w": 3, "h": 120},
        {"key": "detection_engine", "def": "detectionEngine", "order": 8, "w": 2, "h": 380},
        {"key": "severity_dist", "def": "severityDistribution", "order": 9, "w": 2, "h": 380},
        {"key": "prevalent_threats", "def": "prevalentThreats", "order": 10, "w": 3, "h": 380},
        {"key": "mitigation_stats", "def": "mitigationStatusDist", "order": 11, "w": 3, "h": 380},
        {"key": "agent_status_dist", "def": "agentStatusDist", "order": 12, "w": 3, "h": 380},
        {"key": "detailed_mitigation_dist", "def": "detailedMitigationDist", "order": 20, "w": 1, "h": 450},
    ]

    agent_panels = [
        {"key": "total_agents", "def": "totalAgents", "order": 1, "w": 4, "h": 120},
        {"key": "active_agents", "def": "activeAgents", "order": 2, "w": 4, "h": 120},
        {"key": "inactive_agents", "def": "inactiveAgents", "order": 3, "w": 4, "h": 120},
        {"key": "infected_agents", "def": "infectedAgents", "order": 4, "w": 4, "h": 120},
        {"key": "agent_os_dist", "def": "agentOSDistribution", "order": 5, "w": 2, "h": 380},
        {"key": "agent_version_dist", "def": "agentVersionDistribution", "order": 6, "w": 2, "h": 380},
        {"key": "agent_scan_status", "def": "agentScanStatus", "order": 7, "w": 1, "h": 300},
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
                "custom_query": None,
                "updated_at": datetime.utcnow().isoformat()
            }
            client.index(index=index_name, id=f"{dashboard_id}_{p['key']}", body=doc)

    index_panels("threat-status", threat_panels)
    index_panels("agent-dashboard", agent_panels)
    
    print("인덱스 초기화 완료 (커스텀 쿼리 필드 포함)")

if __name__ == "__main__":
    init_dashboard_index()
