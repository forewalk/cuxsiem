from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.deps import get_current_active_user
from app.schemas.detection_policy import (
    DetectorCreate,
    DetectorUpdate,
    DetectorResponse,
    DetectorListResponse,
    FindingListResponse,
    FindingStatusUpdate,
)
from app.schemas.user import UserResponse
from app.services.detection_policy import DetectionPolicyService

router = APIRouter()
event_router = APIRouter()
service = DetectionPolicyService()


# ── Detector API ──────────────────────────────────────────────────────────

@router.get("", response_model=DetectorListResponse)
async def list_detectors(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    sort_by: str = Query("created_at", pattern="^(created_at|updated_at|name|last_triggered_at)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    query: Optional[str] = Query(None, description="이름 검색"),
    severity: Optional[str] = Query(None, description="심각도 필터"),
    is_active: Optional[bool] = Query(None, description="활성화 여부"),
    detector_type: Optional[str] = Query(None, description="windows/network/linux/application/cloud/custom"),
):
    total, items = await service.list_detectors(
        skip=skip, limit=limit, sort_by=sort_by, order=order,
        query=query, severity=severity, is_active=is_active,
        detector_type=detector_type,
    )
    return {"total": total, "items": items}


@router.post("", response_model=DetectorResponse, status_code=status.HTTP_201_CREATED)
async def create_detector(
    detector_in: DetectorCreate,
    current_user: UserResponse = Depends(get_current_active_user),
):
    return await service.create_detector(detector_in, user_id=current_user.id)


@router.get("/{detector_id}", response_model=DetectorResponse)
async def get_detector(detector_id: str):
    detector = await service.get_detector(detector_id)
    if not detector:
        raise HTTPException(status_code=404, detail="Detector not found")
    return detector


@router.put("/{detector_id}", response_model=DetectorResponse)
async def update_detector(
    detector_id: str,
    detector_in: DetectorUpdate,
    current_user: UserResponse = Depends(get_current_active_user),
):
    detector = await service.update_detector(detector_id, detector_in)
    if not detector:
        raise HTTPException(status_code=404, detail="Detector not found")
    return detector


@router.delete("/{detector_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_detector(
    detector_id: str,
    current_user: UserResponse = Depends(get_current_active_user),
):
    success = await service.delete_detector(detector_id)
    if not success:
        raise HTTPException(status_code=404, detail="Detector not found")


@router.post("/test-query")
async def test_detection_query(request: dict):
    target_index = request.get("target_index")
    query_body = request.get("query_body") or request.get("condition_config")
    if not target_index or not query_body:
        raise HTTPException(status_code=400, detail="target_index and query_body are required")
    try:
        return await service.test_query(target_index, query_body)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Finding API ───────────────────────────────────────────────────────────

@event_router.get("", response_model=FindingListResponse)
async def list_findings(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    sort_by: str = Query("created_at"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    detector_id: Optional[str] = Query(None, description="Detector ID 필터"),
    severity: Optional[str] = Query(None, description="심각도 필터"),
    status: Optional[str] = Query(None, description="상태 필터 (new/acknowledged/resolved/false_positive)"),
    from_date: Optional[str] = Query(None, description="시작 날짜 (ISO 8601)"),
    to_date: Optional[str] = Query(None, description="종료 날짜 (ISO 8601)"),
):
    total, items = await service.list_findings(
        skip=skip, limit=limit, sort_by=sort_by, order=order,
        detector_id=detector_id, severity=severity, status=status,
        from_date=from_date, to_date=to_date,
    )
    return {"total": total, "items": items}


@event_router.put("/{finding_id}/status")
async def update_finding_status(
    finding_id: str,
    body: FindingStatusUpdate,
    current_user: UserResponse = Depends(get_current_active_user),
):
    valid = {"new", "acknowledged", "resolved", "false_positive"}
    if body.status not in valid:
        raise HTTPException(status_code=400, detail=f"status must be one of: {valid}")
    result = await service.update_finding_status(finding_id, body.status)
    if not result:
        raise HTTPException(status_code=404, detail="Finding not found")
    return result
