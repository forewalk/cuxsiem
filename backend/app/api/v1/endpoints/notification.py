from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse

from app.api.v1.deps import get_current_active_user
from app.schemas.notification import (
    NotificationRuleBase,
    NotificationRuleUpdate,
    NotificationRuleResponse,
    NotificationRuleListResponse,
    NotificationListResponse
)
from app.schemas.user import UserResponse
from app.services.notification import NotificationService
from app.services.webhook import send_test_webhook

router = APIRouter()
service = NotificationService()


# --- 알림규칙 목록 조회 ---

@router.get("/rules", response_model=NotificationRuleListResponse)
async def list_rules(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    sort_by: str = Query("created_at", pattern="^(created_at|updated_at|name|last_triggered_at)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    query: Optional[str] = Query(None, description="규칙명 검색"),
    severities: Optional[str] = Query(None, description="중요도 필터 (쉼표로 구분)"),
    is_active: Optional[bool] = Query(None, description="활성화 여부"),
    from_date: Optional[str] = Query(None, description="시작 날짜 (ISO 8601)"),
    to_date: Optional[str] = Query(None, description="종료 날짜 (ISO 8601)")
):
    # severities를 리스트로 변환
    severity_list = [s.strip().lower() for s in severities.split(",")] if severities else None

    total, rules = await service.list_rules(
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        order=order,
        query=query,
        severities=severity_list,
        is_active=is_active,
        from_date=from_date,
        to_date=to_date
    )
    return {"total": total, "items": rules}


# --- 알림규칙 생성 ---
@router.post("/rules", response_model=NotificationRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_rule(rule_in: NotificationRuleBase, current_user: UserResponse = Depends(get_current_active_user)):
    return await service.create_rule(rule_in, user_id=current_user.id)


@router.get("/rules/{rule_id}", response_model=NotificationRuleResponse)
async def get_rule(rule_id: str):
    rule = await service.get_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.put("/rules/{rule_id}", response_model=NotificationRuleResponse)
async def update_rule(rule_id: str, rule_in: NotificationRuleUpdate, current_user: UserResponse = Depends(get_current_active_user)):
    rule = await service.update_rule(rule_id, rule_in, user_id=current_user.id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(rule_id: str):
    success = await service.delete_rule(rule_id)
    if not success:
        raise HTTPException(status_code=404, detail="Rule not found")


@router.post("/rules/test-query")
async def test_query(request: dict):
    """
    DSL 쿼리를 실행하여 결과 미리보기
    - 규칙 생성 전 쿼리 검증용
    - OpenSearch 응답을 그대로 반환

    Request Body:
    {
        "target_index": "logs-sentinel_one.edr",
        "condition_config": { ... DSL 쿼리 ... }
    }
    """
    target_index = request.get("target_index")
    condition_config = request.get("condition_config")

    if not target_index or not condition_config:
        raise HTTPException(status_code=400, detail="target_index and condition_config are required")

    try:
        result = await service.test_query(target_index, condition_config)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query execution failed: {str(e)}")


@router.post("/rules/test-trigger")
async def test_trigger(request: dict):
    """
    쿼리 실행 후 트리거 조건을 평가하여 결과 반환
    Request Body:
    {
        "target_index": "logs-sentinel_one.edr",
        "condition_config": { ... DSL 쿼리 ... },
        "trigger_condition": "total > 0"
    }
    """
    target_index = request.get("target_index")
    condition_config = request.get("condition_config")
    trigger_condition = request.get("trigger_condition")

    if not target_index or not condition_config:
        raise HTTPException(status_code=400, detail="target_index and condition_config are required")

    try:
        result = await service.test_trigger(target_index, condition_config, trigger_condition)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Trigger evaluation failed: {str(e)}")


@router.post("/webhook/test")
async def test_webhook(request: dict):
    """
    Webhook 연결 테스트
    Request Body: { "url": "http://...", "headers": {} }
    """
    url = request.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="Webhook URL이 필요합니다.")

    headers = request.get("headers") or {}
    result = await send_test_webhook(url, headers)

    if result["status"] == "success":
        return {"success": True, "message": f"Webhook 테스트 성공 (HTTP {result['status_code']})"}
    else:
        return {"success": False, "message": result.get("error", "발송 실패"), "detail": result}


# --- 규칙 Export / Import ---

@router.get("/rules/export")
async def export_rules():
    """모든 활성 규칙을 JSON으로 내보내기"""
    total, rules = await service.list_rules(skip=0, limit=10000)

    export_fields = [
        "name", "description", "target_index", "condition_config",
        "message_template", "severity", "interval_min", "trigger_condition",
        "receiver", "is_active"
    ]
    exported = []
    for rule in rules:
        exported.append({k: rule.get(k) for k in export_fields if k in rule})

    from datetime import datetime as dt
    return JSONResponse(content={
        "version": "1.0",
        "exported_at": dt.utcnow().isoformat() + "Z",
        "rules": exported
    })


@router.post("/rules/import")
async def import_rules(request: dict):
    """
    JSON 규칙 목록을 가져와서 일괄 생성.
    Request Body: { "rules": [...], "overwrite": false }
    overwrite=true 시 동일 이름 규칙 덮어쓰기
    """
    rules_data: list = request.get("rules", [])
    overwrite: bool = request.get("overwrite", False)

    if not rules_data:
        raise HTTPException(status_code=400, detail="rules 배열이 비어있습니다.")

    created = 0
    updated = 0
    errors = []

    for idx, rule_data in enumerate(rules_data):
        try:
            if not rule_data.get("name"):
                errors.append({"index": idx, "error": "name 필드 필수"})
                continue

            existing_rule = None
            if overwrite:
                _, existing_rules = await service.list_rules(
                    skip=0, limit=1, query=rule_data["name"]
                )
                for er in existing_rules:
                    if er.get("name") == rule_data["name"]:
                        existing_rule = er
                        break

            if existing_rule and overwrite:
                update_data = NotificationRuleUpdate(**{
                    k: v for k, v in rule_data.items()
                    if k in NotificationRuleUpdate.model_fields and v is not None
                })
                await service.update_rule(existing_rule["id"], update_data)
                updated += 1
            else:
                rule_in = NotificationRuleBase(**rule_data)
                await service.create_rule(rule_in)
                created += 1
        except Exception as e:
            errors.append({"index": idx, "name": rule_data.get("name", ""), "error": str(e)})

    return {
        "created": created,
        "updated": updated,
        "errors": errors,
        "total_processed": len(rules_data)
    }


# --- 알림내역 조회 ---

@router.get("/", response_model=NotificationListResponse)
async def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    query: Optional[str] = Query(None, description="제목/설명 검색"),
    severities: Optional[str] = Query(None, description="중요도 필터 (쉼표로 구분)"),
    from_date: Optional[str] = Query(None, description="시작 날짜 (ISO 8601)"),
    to_date: Optional[str] = Query(None, description="종료 날짜 (ISO 8601)"),
    current_user: UserResponse = Depends(get_current_active_user)
):
    """현재 사용자의 role에 맞는 알림만 조회"""
    # severities를 리스트로 변환
    severity_list = [s.strip().lower() for s in severities.split(",")] if severities else None

    total, notifications = await service.list_notifications(
        skip=skip,
        limit=limit,
        query=query,
        severities=severity_list,
        from_date=from_date,
        to_date=to_date,
        user_role=current_user.role
    )
    return {"total": total, "items": notifications}
