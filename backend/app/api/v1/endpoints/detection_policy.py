from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse

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
from app.services.webhook import send_test_webhook

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


@router.post("/webhook/test")
async def test_detector_webhook(request: dict):
    url = request.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="Webhook URL이 필요합니다.")
    headers = request.get("headers") or {}
    result = await send_test_webhook(url, headers)
    if result["status"] == "success":
        return {"success": True, "message": f"Webhook 테스트 성공 (HTTP {result['status_code']})"}
    return {"success": False, "message": result.get("error", "발송 실패"), "detail": result}


@router.get("/export")
async def export_detectors(
    ids: Optional[str] = Query(None, description="쉼표로 구분된 Detector ID 목록 (미지정 시 전체)"),
):
    total, detectors = await service.list_detectors(skip=0, limit=10000)
    if ids:
        id_set = {i.strip() for i in ids.split(",") if i.strip()}
        detectors = [d for d in detectors if d.get("id") in id_set]
    export_fields = [
        "name", "description", "detector_type", "target_indices",
        "linked_rule_ids", "field_mappings", "schedule_interval_min",
        "trigger_condition", "message_template", "severity", "is_active",
        "timestamp_field", "max_search_window_min", "webhook_url", "webhook_headers", "webhook_body",
    ]
    exported = [{k: d.get(k) for k in export_fields if k in d} for d in detectors]
    from datetime import datetime as dt
    return JSONResponse(content={
        "version": "1.0",
        "type": "detectors",
        "exported_at": dt.utcnow().isoformat() + "Z",
        "detectors": exported,
    })


@router.post("/bulk-delete", status_code=status.HTTP_200_OK)
async def bulk_delete_detectors(
    request: dict,
    current_user: UserResponse = Depends(get_current_active_user),
):
    ids: list = request.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="ids 배열이 비어있습니다.")
    deleted, errors = 0, []
    for detector_id in ids:
        try:
            success = await service.delete_detector(detector_id)
            if success:
                deleted += 1
            else:
                errors.append({"id": detector_id, "error": "not found"})
        except Exception as e:
            errors.append({"id": detector_id, "error": str(e)})
    return {"deleted": deleted, "errors": errors}


@router.post("/import")
async def import_detectors(
    request: dict,
    current_user: UserResponse = Depends(get_current_active_user),
):
    detectors_data: list = request.get("detectors", [])
    overwrite: bool = request.get("overwrite", False)
    if not detectors_data:
        raise HTTPException(status_code=400, detail="detectors 배열이 비어있습니다.")

    created, updated, errors = 0, 0, []
    for idx, det_data in enumerate(detectors_data):
        try:
            if not det_data.get("name"):
                errors.append({"index": idx, "error": "name 필드 필수"})
                continue
            existing_det = None
            if overwrite:
                _, existing_list = await service.list_detectors(skip=0, limit=1, query=det_data["name"])
                for ed in existing_list:
                    if ed.get("name") == det_data["name"]:
                        existing_det = ed
                        break
            if existing_det and overwrite:
                update_data = DetectorUpdate(**{
                    k: v for k, v in det_data.items()
                    if k in DetectorUpdate.model_fields and v is not None
                })
                await service.update_detector(existing_det["id"], update_data, user_id=current_user.id)
                updated += 1
            else:
                det_in = DetectorCreate(**det_data)
                await service.create_detector(det_in, user_id=current_user.id)
                created += 1
        except Exception as e:
            errors.append({"index": idx, "name": det_data.get("name", ""), "error": str(e)})

    return {"created": created, "updated": updated, "errors": errors, "total_processed": len(detectors_data)}


# ── Parameterized routes (must come after static paths) ───────────────────

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
    detector = await service.update_detector(detector_id, detector_in, user_id=current_user.id)
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
