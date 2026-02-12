from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.services.notification import NotificationService
from app.schemas.notification import (
    NotificationRuleBase,
    NotificationRuleUpdate,
    NotificationRuleResponse,
    NotificationResponse
)

router = APIRouter()
service = NotificationService()

# --- Notification Rules ---

@router.get("/rules", response_model=List[NotificationRuleResponse])
async def list_rules(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    sort_by: str = Query("created_at", pattern="^(created_at|updated_at|name)$"),
    order: str = Query("desc", pattern="^(asc|desc)$")
):
    total, rules = await service.list_rules(skip=skip, limit=limit, sort_by=sort_by, order=order)
    return rules

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

# --- 알림내역 조회 ---

@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    receiver_type: Optional[str] = "role",
    receiver_value: Optional[str] = "admin"
):
    total, notifications = await service.list_notifications(
        skip=skip,
        limit=limit,
        receiver_type=receiver_type,
        receiver_value=receiver_value
    )
    return notifications
