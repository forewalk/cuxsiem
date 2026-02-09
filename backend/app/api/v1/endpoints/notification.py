from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.services.notification import NotificationService
from app.schemas.notification import (
    NotificationRuleCreate, 
    NotificationRuleUpdate, 
    NotificationRuleResponse,
    NotificationResponse,
    NotificationReadUpdate
)

router = APIRouter()
service = NotificationService()

# --- Notification Rules ---

@router.get("/rules", response_model=List[NotificationRuleResponse])
async def list_rules(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    total, rules = await service.list_rules(skip=skip, limit=limit)
    return rules

@router.post("/rules", response_model=NotificationRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_rule(rule_in: NotificationRuleCreate):
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

# --- Notification Logs ---

@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    severity: Optional[str] = None,
    is_read: Optional[bool] = None,
    receiver_type: Optional[str] = None,
    receiver_value: Optional[str] = None
):
    total, notifications = await service.list_notifications(
        skip=skip, 
        limit=limit, 
        severity=severity, 
        is_read=is_read, 
        receiver_type=receiver_type,
        receiver_value=receiver_value
    )
    return notifications

@router.patch("/{notification_id}/read", response_model=bool)
async def mark_as_read(notification_id: str, read_in: NotificationReadUpdate):
    success = await service.mark_as_read(notification_id, read_in.is_read)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return True

@router.post("/read-all", response_model=int)
async def mark_all_as_read():
    return await service.mark_all_as_read()

@router.post("/rules/{rule_id}/test")
async def test_rule_detection(rule_id: str):
    """특정 규칙에 대한 탐지를 즉시 테스트 실행"""
    rule = await service.get_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    result = await service.run_detection_for_rule(rule)
    if result:
        return {"status": "success", "notification": result}
    return {"status": "no_threats_found"}
