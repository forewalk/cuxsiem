"""대시보드 API 엔드포인트"""
from fastapi import APIRouter, Depends, Query, Body
from typing import List, Optional
from app.schemas.dashboard import DashboardStatsResponse, DashboardPanelUpdate
from app.services.dashboard import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/indices", response_model=List[str])
async def get_indices():
    service = DashboardService()
    return await service.get_indices()

@router.get("/fields/{index_name}")
async def get_fields(index_name: str):
    service = DashboardService()
    return await service.get_fields(index_name)

@router.get("/logs", response_model=List[dict])
async def get_logs(
    dashboard_id: str = Query("threat-status"),
    from_value: Optional[int] = Query(None),
    from_unit: Optional[str] = Query(None),
    to_value: Optional[int] = Query(None),
    to_unit: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    size: int = Query(20),
    offset: int = Query(0)
):
    service = DashboardService()
    return await service.get_logs(dashboard_id=dashboard_id, from_value=from_value, from_unit=from_unit, to_value=to_value, to_unit=to_unit, from_date=from_date, to_date=to_date, query=q, size=size, offset=offset)

@router.put("/panels/{dashboard_id}/{panel_key}")
async def update_panel(dashboard_id: str, panel_key: str, update_data: DashboardPanelUpdate):
    service = DashboardService()
    success = await service.update_panel_settings(dashboard_id, panel_key, update_data.title, update_data.language, update_data.grid_width, update_data.grid_height, update_data.custom_query)
    return {"status": "success" if success else "failed"}

@router.post("/save/{dashboard_id}")
async def save_layout(dashboard_id: str, panels: List[dict]):
    service = DashboardService()
    success = await service.save_dashboard_layout(dashboard_id, panels)
    return {"status": "success" if success else "failed"}

@router.post("/reset/{dashboard_id}")
async def reset_dashboard(dashboard_id: str):
    service = DashboardService()
    success = await service.reset_dashboard_settings(dashboard_id)
    return {"status": "success" if success else "failed"}

@router.get("/stats", response_model=DashboardStatsResponse)
async def get_stats(
    dashboard_id: str = Query("threat-status"),
    from_value: Optional[int] = Query(None),
    from_unit: Optional[str] = Query(None),
    to_value: Optional[int] = Query(None),
    to_unit: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    q: Optional[str] = Query(None)
):
    service = DashboardService()
    return await service.get_dashboard_stats(dashboard_id, from_value, from_unit, to_value, to_unit, from_date, to_date, q)

@router.post("/stats/{dashboard_id}", response_model=DashboardStatsResponse)
async def get_stats_post(
    dashboard_id: str,
    from_value: Optional[int] = Query(None),
    from_unit: Optional[str] = Query(None),
    to_value: Optional[int] = Query(None),
    to_unit: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    panels: List[dict] = Body(...)
):
    """로컬(수정 중) 패널 설정을 기반으로 통계를 실시간 집계합니다. (DB 저장 안함)"""
    service = DashboardService()
    return await service.get_dashboard_stats(
        dashboard_id, from_value, from_unit, to_value, to_unit, from_date, to_date, q,
        panels_override=panels
    )
