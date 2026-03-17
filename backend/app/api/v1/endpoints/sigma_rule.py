from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.deps import get_current_active_user
from app.schemas.sigma_rule import (
    SigmaRuleListResponse,
    SigmaRuleResponse,
    SigmaRuleStatsResponse,
    SigmaRuleToggleResponse,
)
from app.schemas.user import UserResponse
from app.services.sigma_rule import SigmaRuleService

router = APIRouter()
service = SigmaRuleService()


@router.get("", response_model=SigmaRuleListResponse)
async def list_sigma_rules(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    sort_by: str = Query("updated_at", pattern="^(updated_at|created_at|name|level_normalized)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    search: Optional[str] = Query(None, description="이름/설명 텍스트 검색"),
    severity: Optional[str] = Query(None, description="critical/high/medium/low/info"),
    status: Optional[str] = Query(None, description="active/inactive/deleted"),
    log_source_product: Optional[str] = Query(None, description="로그 소스 제품"),
    mitre_technique_id: Optional[str] = Query(None, description="MITRE 기술 ID"),
):
    total, items = await service.list_rules(
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        order=sort_order,
        search=search,
        severity=severity,
        status=status,
        log_source_product=log_source_product,
        mitre_technique_id=mitre_technique_id,
    )
    return {"total": total, "items": items}


@router.get("/stats", response_model=SigmaRuleStatsResponse)
async def get_sigma_rule_stats():
    return await service.get_stats()


@router.get("/{rule_id}", response_model=SigmaRuleResponse)
async def get_sigma_rule(rule_id: str):
    rule = await service.get_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.put("/{rule_id}/toggle", response_model=SigmaRuleToggleResponse)
async def toggle_sigma_rule(
    rule_id: str,
    current_user: UserResponse = Depends(get_current_active_user),
):
    result = await service.toggle_status(rule_id)
    if not result:
        raise HTTPException(status_code=404, detail="Rule not found")
    return result


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sigma_rule(
    rule_id: str,
    current_user: UserResponse = Depends(get_current_active_user),
):
    success = await service.delete_rule(rule_id, deleted_by=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Rule not found")
