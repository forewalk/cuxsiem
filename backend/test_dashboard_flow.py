import asyncio
import os
import sys
from dotenv import load_dotenv

# Load .env before importing app modules
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(ROOT_DIR, ".env"))

from app.services.dashboard import DashboardService
from app.repositories.dashboard import DashboardRepository

async def test_add_and_stats():
    service = DashboardService()
    repo = DashboardRepository()
    
    dashboard_id = "threat-status"
    
    # 1. Get current panels
    panels = await repo.get_panels(dashboard_id)
    print(f"Current panels count: {len(panels)}")
    
    # 2. Add a new custom metric panel
    new_pk = f"custom_metric_test_{int(asyncio.get_event_loop().time())}"
    new_panel = {
        "panel_key": new_pk,
        "custom_titles": {"ko": "테스트 패널"},
        "grid_width": 4,
        "grid_height": 120,
        "display_order": len(panels) + 1,
        "widget_type": "metric",
        "target_field": None,
        "custom_query": "*",
        "is_visible": True
    }
    
    print(f"Adding new panel: {new_pk}")
    success = await service.save_dashboard_layout(dashboard_id, panels + [new_panel])
    print(f"Save success: {success}")
    
    # 3. Fetch stats
    stats = await service.get_dashboard_stats(dashboard_id)
    
    # 4. Check if new panel has data
    found = False
    for p in stats.panels:
        if p.panel_key == new_pk:
            found = True
            print(f"Found new panel in stats. current_value: {p.current_value}")
            break
    
    if not found:
        print("Error: New panel NOT found in stats response!")
    
    # 5. Check other panels to compare
    if stats.panels:
        first = stats.panels[0]
        print(f"Comparison: first panel ({first.panel_key}) current_value: {first.current_value}")

if __name__ == "__main__":
    asyncio.run(test_add_and_stats())
