"""고급 설정 API 엔드포인트"""
from fastapi import APIRouter, HTTPException
from app.schemas.advanced_settings import AdvancedSettingsResponse, AdvancedSettingsUpdate
from app.services.advanced_settings import advanced_settings_service

router = APIRouter()

@router.get("", response_model=AdvancedSettingsResponse)
async def get_advanced_settings():
    """현재 고급 설정 조회"""
    return await advanced_settings_service.get_settings()

@router.put("", response_model=AdvancedSettingsResponse)
async def update_advanced_settings(settings: AdvancedSettingsUpdate):
    """고급 설정 업데이트"""
    return await advanced_settings_service.update_settings(settings)
