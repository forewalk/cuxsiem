"""고급 설정 Service"""
from datetime import datetime
from typing import Optional
from app.repositories.advanced_settings import AdvancedSettingsRepository
from app.models.advanced_settings import AdvancedSettings
from app.schemas.advanced_settings import AdvancedSettingsUpdate

class AdvancedSettingsService:
    def __init__(self):
        self.repository = AdvancedSettingsRepository()

    async def get_settings(self, user_id: str = "global") -> AdvancedSettings:
        """현재 설정 조회 (사용자별 설정이 없으면 글로벌 설정에서 복사)"""
        # 1. 사용자 전용 설정 조회
        settings = await self.repository.get_settings(user_id)
        
        if not settings:
            if user_id != "global":
                # 2. 사용자 전용 설정이 없으면 글로벌 설정 조회
                global_settings = await self.repository.get_settings("global")
                if global_settings:
                    # 글로벌 설정이 있으면 사용자 ID만 바꿔서 리턴 (저장은 업데이트 시점에 함)
                    global_settings.user_id = user_id
                    return global_settings
            
            # 3. 글로벌 설정도 없거나 요청이 global인 경우 기본값 생성
            settings = AdvancedSettings(
                user_register=False,
                allow_multiple_sessions=False,
                tab_count=10,
                updated_at=datetime.utcnow(),
                user_id=user_id,
                pagination_size=10,
                time_filter_duration=15,
                time_filter_unit="m",
                pixel_mode=False,
                log_stream_size=1000,
                log_stream_refresh=10,
                session_duration=30,
                otp_required=False,
            )
            # 글로벌 설정이 아예 없는 경우에만 저장 (최초 초기화용)
            if user_id == "global":
                await self.repository.update_settings(settings)
                
        return settings

    async def update_settings(self, update_data: AdvancedSettingsUpdate, user_id: str = "global") -> AdvancedSettings:
        """설정 업데이트"""
        settings = AdvancedSettings(
            user_register=update_data.user_register,
            allow_multiple_sessions=update_data.allow_multiple_sessions,
            tab_count=update_data.tab_count,
            updated_at=datetime.utcnow(),
            user_id=user_id,
            pagination_size=update_data.pagination_size,
            time_filter_duration=update_data.time_filter_duration,
            time_filter_unit=update_data.time_filter_unit,
            pixel_mode=update_data.pixel_mode,
            log_stream_size=update_data.log_stream_size,
            log_stream_refresh=update_data.log_stream_refresh,
            session_duration=update_data.session_duration,
            otp_required=update_data.otp_required,
        )
        return await self.repository.update_settings(settings)

advanced_settings_service = AdvancedSettingsService()
