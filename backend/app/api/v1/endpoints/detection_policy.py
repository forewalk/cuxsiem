from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.deps import get_current_active_user
from app.schemas.detection_policy import (
    DetectionPolicyCreate,
    DetectionPolicyUpdate,
    DetectionPolicyResponse,
    DetectionPolicyListResponse,
    DetectionEventListResponse,
    DetectionEventStatusUpdate,
)
from app.schemas.user import UserResponse
from app.services.detection_policy import DetectionPolicyService

router = APIRouter()
event_router = APIRouter()
service = DetectionPolicyService()


# ── 탐지 정책 API ────────────────────────────────────────────────────────

@router.get("", response_model=DetectionPolicyListResponse)
async def list_detection_policies(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    sort_by: str = Query("created_at", pattern="^(created_at|updated_at|name|last_triggered_at)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    query: Optional[str] = Query(None, description="정책명 검색"),
    severity: Optional[str] = Query(None, description="심각도 필터"),
    is_active: Optional[bool] = Query(None, description="활성화 여부"),
):
    total, items = await service.list_policies(
        skip=skip, limit=limit, sort_by=sort_by, order=order,
        query=query, severity=severity, is_active=is_active,
    )
    return {"total": total, "items": items}


@router.post("", response_model=DetectionPolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_detection_policy(
    policy_in: DetectionPolicyCreate,
    current_user: UserResponse = Depends(get_current_active_user),
):
    return await service.create_policy(policy_in, user_id=current_user.id)


@router.get("/{policy_id}", response_model=DetectionPolicyResponse)
async def get_detection_policy(policy_id: str):
    policy = await service.get_policy(policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy


@router.put("/{policy_id}", response_model=DetectionPolicyResponse)
async def update_detection_policy(
    policy_id: str,
    policy_in: DetectionPolicyUpdate,
    current_user: UserResponse = Depends(get_current_active_user),
):
    policy = await service.update_policy(policy_id, policy_in)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy


@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_detection_policy(
    policy_id: str,
    current_user: UserResponse = Depends(get_current_active_user),
):
    success = await service.delete_policy(policy_id)
    if not success:
        raise HTTPException(status_code=404, detail="Policy not found")


@router.post("/test-query")
async def test_detection_query(request: dict):
    target_index = request.get("target_index")
    condition_config = request.get("condition_config")
    if not target_index or not condition_config:
        raise HTTPException(status_code=400, detail="target_index and condition_config are required")
    try:
        return await service.test_query(target_index, condition_config)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── 탐지 이벤트 API ──────────────────────────────────────────────────────

@event_router.get("", response_model=DetectionEventListResponse)
async def list_detection_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    sort_by: str = Query("created_at"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    policy_id: Optional[str] = Query(None, description="정책 ID 필터"),
    severity: Optional[str] = Query(None, description="심각도 필터"),
    status: Optional[str] = Query(None, description="상태 필터 (new/acknowledged/resolved/false_positive)"),
    from_date: Optional[str] = Query(None, description="시작 날짜 (ISO 8601)"),
    to_date: Optional[str] = Query(None, description="종료 날짜 (ISO 8601)"),
):
    total, items = await service.list_events(
        skip=skip, limit=limit, sort_by=sort_by, order=order,
        policy_id=policy_id, severity=severity, status=status,
        from_date=from_date, to_date=to_date,
    )
    return {"total": total, "items": items}


@event_router.put("/{event_id}/status")
async def update_detection_event_status(
    event_id: str,
    body: DetectionEventStatusUpdate,
    current_user: UserResponse = Depends(get_current_active_user),
):
    valid = {"new", "acknowledged", "resolved", "false_positive"}
    if body.status not in valid:
        raise HTTPException(status_code=400, detail=f"status must be one of: {valid}")
    result = await service.update_event_status(event_id, body.status)
    if not result:
        raise HTTPException(status_code=404, detail="Event not found")
    return result
