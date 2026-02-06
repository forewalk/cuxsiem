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
    index_name: str = Query(None, description="조회할 인덱스명 (미지정 시 전체)"),
    time_range: str = Query("15m", regex="^(15m|1h|24h|48h)$", description="조회 기간 (15m, 1h, 24h, 48h)"),
    q: Optional[str] = Query(None, description="검색 쿼리 (Lucene syntax)")
):
    """대시보드 통계 데이터 조회 (검색 필터 포함)"""
    service = DashboardService()
    return await service.get_dashboard_stats(index_name, time_range, q)
