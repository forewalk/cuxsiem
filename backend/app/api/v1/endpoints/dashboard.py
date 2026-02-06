"""대시보드 API 엔드포인트"""
from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from app.schemas.dashboard import DashboardStatsResponse
from app.services.dashboard import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/indices", response_model=List[str])
async def get_indices():
    service = DashboardService()
    return await service.get_indices()

@router.get("/stats", response_model=DashboardStatsResponse)
async def get_stats(
    from_value: int = Query(15, description="조회 시작 기간 값"),
    from_unit: str = Query("m", regex="^(m|h|d)$", description="조회 시작 기간 단위"),
    to_value: Optional[int] = Query(None, description="조회 종료 기간 값 (미지정 시 현재)"),
    to_unit: Optional[str] = Query(None, regex="^(m|h|d)$", description="조회 종료 기간 단위"),
    q: Optional[str] = Query(None, description="검색 쿼리")
):
    """대시보드 통계 데이터 조회 (시작/종료 기간 필터링 포함)"""
    service = DashboardService()
    return await service.get_dashboard_stats(from_value, from_unit, to_value, to_unit, q)
