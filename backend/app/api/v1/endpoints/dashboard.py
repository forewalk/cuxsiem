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

@router.get("/fields/{index_name}")
async def get_fields(index_name: str):
    """인덱스의 필드 목록 조회"""
    service = DashboardService()
    return await service.get_fields(index_name)

@router.get("/logs", response_model=List[dict])
async def get_logs(
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
    """로그 데이터 목록 조회"""
    service = DashboardService()
    return await service.get_logs(
        from_value=from_value, from_unit=from_unit,
        to_value=to_value, to_unit=to_unit,
        from_date=from_date, to_date=to_date,
        query=q, size=size, offset=offset
    )

@router.get("/stats", response_model=DashboardStatsResponse)
async def get_stats(
    from_value: Optional[int] = Query(None, description="조회 시작 기간 값"),
    from_unit: Optional[str] = Query(None, pattern="^(m|h|d)$", description="조회 시작 기간 단위"),
    to_value: Optional[int] = Query(None, description="조회 종료 기간 값"),
    to_unit: Optional[str] = Query(None, pattern="^(m|h|d)$", description="조회 종료 기간 단위"),
    from_date: Optional[str] = Query(None, description="절대 시작 시간 (ISO)"),
    to_date: Optional[str] = Query(None, description="절대 종료 시간 (ISO)"),
    q: Optional[str] = Query(None, description="검색 쿼리")
):
    """대시보드 통계 데이터 조회 (상대/절대 기간 필터링 포함)"""
    service = DashboardService()
    return await service.get_dashboard_stats(from_value, from_unit, to_value, to_unit, from_date, to_date, q)