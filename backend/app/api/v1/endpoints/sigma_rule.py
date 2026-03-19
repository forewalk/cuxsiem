from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.deps import get_current_active_user
from app.schemas.sigma_rule import (
    SigmaRuleListResponse,
    SigmaRuleResponse,
    SigmaRuleStatsResponse,
    SigmaRuleToggleResponse,
    FilterOptionsResponse,
    CustomRuleCreate,
    CustomRuleUpdate,
    ConversionStatsResponse,
    ReconvertJobResponse,
    ReconvertResultResponse,
    BulkReconvertRequest,
)
from app.schemas.user import UserResponse
from app.services.sigma_rule import SigmaRuleService

router = APIRouter()
service = SigmaRuleService()


@router.get("", response_model=SigmaRuleListResponse)
async def list_sigma_rules(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=500),
    sort_by: str = Query("updated_at", pattern="^(updated_at|created_at|name|level_normalized)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    search: Optional[str] = Query(None, description="이름/설명 텍스트 검색"),
    severity: Optional[str] = Query(None, description="콤마 구분 복수값 가능: critical,high,medium,low,info"),
    status: Optional[str] = Query(None, description="active/inactive/deleted"),
    log_source_product: Optional[str] = Query(None, description="콤마 구분 복수값 가능"),
    log_source_category: Optional[str] = Query(None, description="콤마 구분 복수값 가능"),
    log_type_keywords: Optional[str] = Query(None, description="로그타입 keywords (product/category/service 매칭)"),
    mitre_technique_id: Optional[str] = Query(None, description="MITRE 기술 ID"),
    rule_type: Optional[str] = Query(None, description="콤마 구분 복수값 가능: sigma,custom"),
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
        log_source_category=log_source_category,
        log_type_keywords=log_type_keywords,
        mitre_technique_id=mitre_technique_id,
        rule_type=rule_type,
    )
    return {"total": total, "items": items}


@router.post("", response_model=SigmaRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_rule(
    rule_in: CustomRuleCreate,
    current_user: UserResponse = Depends(get_current_active_user),
):
    return await service.create_custom_rule(rule_in.model_dump())


@router.get("/stats", response_model=SigmaRuleStatsResponse)
async def get_sigma_rule_stats():
    return await service.get_stats()


@router.get("/filter-options", response_model=FilterOptionsResponse)
async def get_filter_options(
    log_source_product: Optional[str] = Query(None, description="로그 타입 선택 시 카테고리 필터링"),
):
    return await service.get_filter_options(log_source_product=log_source_product)


@router.get("/conversion-stats", response_model=ConversionStatsResponse)
async def get_conversion_stats():
    return await service.get_conversion_stats()


@router.post("/reconvert", response_model=ReconvertJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def bulk_reconvert(
    body: BulkReconvertRequest = None,
    current_user: UserResponse = Depends(get_current_active_user),
):
    filter_params = body.filter if body else None
    result = await service.start_bulk_reconvert(filter_params)
    if result.get("error") == "conflict":
        raise HTTPException(status_code=409, detail=f"Reconvert job already running: {result['job_id']}")
    return result


@router.post("/{rule_id}/reconvert", response_model=ReconvertResultResponse)
async def reconvert_single(
    rule_id: str,
    current_user: UserResponse = Depends(get_current_active_user),
):
    result = await service.reconvert_single(rule_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    return result


@router.get("/{rule_id}", response_model=SigmaRuleResponse)
async def get_sigma_rule(rule_id: str):
    rule = await service.get_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.put("/{rule_id}", response_model=SigmaRuleResponse)
async def update_custom_rule(
    rule_id: str,
    rule_in: CustomRuleUpdate,
    current_user: UserResponse = Depends(get_current_active_user),
):
    result = await service.update_custom_rule(rule_id, rule_in.model_dump(exclude_none=True))
    if not result:
        raise HTTPException(status_code=404, detail="Custom rule not found or not editable")
    return result


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
