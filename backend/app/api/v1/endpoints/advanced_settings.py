"""고급 설정 API 엔드포인트"""
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.advanced_settings import AdvancedSettingsResponse, AdvancedSettingsUpdate
from app.services.advanced_settings import advanced_settings_service
from app.api.v1.deps import get_current_active_user

router = APIRouter()

@router.get("", response_model=AdvancedSettingsResponse)
async def get_advanced_settings(user=Depends(get_current_active_user)):
    """현재 사용자용 고급 설정 조회"""
    return await advanced_settings_service.get_settings(user_id=user.id)

@router.put("", response_model=AdvancedSettingsResponse)
async def update_advanced_settings(
    settings: AdvancedSettingsUpdate,
    user=Depends(get_current_active_user)
):
    """사용자용 고급 설정 업데이트"""
    # 글로벌 설정(admin 전용 필드들) 보호 로직
    if user.role != "role-1":
        # 관리자가 아니면 글로벌 설정 값들을 강제로 기존 값으로 유지
        global_settings = await advanced_settings_service.get_settings("global")
        settings.user_register = global_settings.user_register
        settings.otp_required = global_settings.otp_required
        settings.allow_multiple_sessions = global_settings.allow_multiple_sessions
        settings.session_duration = global_settings.session_duration
        
    return await advanced_settings_service.update_settings(settings, user_id=user.id)
