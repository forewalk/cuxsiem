from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

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
async def create_rule(rule_in: NotificationRuleBase):
    return await service.create_rule(rule_in)


@router.get("/rules/{rule_id}", response_model=NotificationRuleResponse)
async def get_rule(rule_id: str):
    rule = await service.get_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.put("/rules/{rule_id}", response_model=NotificationRuleResponse)
async def update_rule(rule_id: str, rule_in: NotificationRuleUpdate):
    rule = await service.update_rule(rule_id, rule_in)
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
