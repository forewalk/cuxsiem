"""고급 설정 API 엔드포인트"""
from fastapi import APIRouter, Depends
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
        "otp_required": settings.otp_required,
    }


@router.get("", response_model=AdvancedSettingsResponse)
async def get_advanced_settings(user=Depends(get_current_active_user)):
    """현재 사용자용 고급 설정 조회.

    관리자: 글로벌 문서 반환.
    일반 사용자: 개인 설정 + 글로벌 설정 병합 결과 반환 (서비스 레이어 처리).
    """
    user_id = "global" if user.role == "role-1" else user.id
    return await advanced_settings_service.get_settings(user_id)


@router.put("", response_model=AdvancedSettingsResponse)
async def update_advanced_settings(
    settings: AdvancedSettingsUpdate,
    user=Depends(get_current_active_user),
):
    """사용자용 고급 설정 업데이트.

    관리자: 글로벌 문서(모든 필드) 업데이트.
    일반 사용자: 개인 설정 필드만 저장 (Repository 레이어에서 글로벌 필드 제거).
    """
    target_user_id = "global" if user.role == "role-1" else user.id
    return await advanced_settings_service.update_settings(settings, user_id=target_user_id)
