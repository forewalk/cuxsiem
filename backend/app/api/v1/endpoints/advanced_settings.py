"""고급 설정 API 엔드포인트"""
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.advanced_settings import AdvancedSettingsResponse, AdvancedSettingsUpdate
from app.services.advanced_settings import advanced_settings_service
from app.api.v1.deps import get_current_active_user

router = APIRouter()

@router.get("/public")
async def get_public_settings():
    """로그인 전에도 접근 가능한 공개 설정 조회"""
    settings = await advanced_settings_service.get_settings("global")
    return {
        "user_register": settings.user_register,
        "otp_required": settings.otp_required
    }

@router.get("", response_model=AdvancedSettingsResponse)
async def get_advanced_settings(user=Depends(get_current_active_user)):
    """현재 사용자용 고급 설정 조회 (글로벌 설정 병합)"""
    # 1. 글로벌 설정 조회
    global_settings = await advanced_settings_service.get_settings("global")
    
    if user.role == "role-1":
        # 관리자는 글로벌 설정을 그대로 반환 (단, user_id는 global로 유지)
        return global_settings
    
    # 2. 일반 사용자는 자신의 설정 조회
    user_settings = await advanced_settings_service.get_settings(user_id=user.id)
    
    # 3. 중요 글로벌 설정값들을 사용자 설정에 덮어쓰기 (강제 적용 필드들)
    user_settings.user_register = global_settings.user_register
    user_settings.otp_required = global_settings.otp_required
    user_settings.allow_multiple_sessions = global_settings.allow_multiple_sessions
    user_settings.session_duration = global_settings.session_duration
    
    return user_settings

@router.put("", response_model=AdvancedSettingsResponse)
async def update_advanced_settings(
    settings: AdvancedSettingsUpdate,
    user=Depends(get_current_active_user)
):
    """사용자용 고급 설정 업데이트"""
    # 관리자인 경우 'global' 설정을 업데이트
    target_user_id = "global" if user.role == "role-1" else user.id
    
    # 일반 사용자(admin 아님)인 경우 글로벌 설정 필드들 보호
    if user.role != "role-1":
        global_settings = await advanced_settings_service.get_settings("global")
        settings.user_register = global_settings.user_register
        settings.otp_required = global_settings.otp_required
        settings.allow_multiple_sessions = global_settings.allow_multiple_sessions
        settings.session_duration = global_settings.session_duration
        
    return await advanced_settings_service.update_settings(settings, user_id=target_user_id)
