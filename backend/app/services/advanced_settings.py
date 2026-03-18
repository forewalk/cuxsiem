"""고급 설정 Service"""
from datetime import datetime
from app.repositories.advanced_settings import AdvancedSettingsRepository
from app.models.advanced_settings import AdvancedSettings
from app.schemas.advanced_settings import AdvancedSettingsUpdate


def _default_settings(user_id: str) -> AdvancedSettings:
    return AdvancedSettings(
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
        session_idle_timeout=0,
        otp_required=False,
    )


class AdvancedSettingsService:
    def __init__(self):
        self.repository = AdvancedSettingsRepository()

    async def get_settings(self, user_id: str = "global") -> AdvancedSettings:
        """설정 조회.

        - 글로벌: cs_policies/advanced_settings 문서 그대로 반환.
        - 사용자: per-user 문서(개인 필드) + 글로벌 문서(글로벌 필드) 병합 후 반환.
        """
        settings = await self.repository.get_settings(user_id)

        if not settings:
            if user_id != "global":
                # 사용자 전용 설정 없음 → 글로벌 설정 기반으로 반환 (저장 X)
                global_settings = await self.repository.get_settings("global")
                if global_settings:
                    global_settings.user_id = user_id
                    return global_settings
            # 기본값 생성
            settings = _default_settings(user_id)
            if user_id == "global":
                await self.repository.update_settings(settings)
            return settings

        # 사용자 문서가 존재하는 경우 글로벌 필드를 글로벌 문서에서 병합
        if user_id != "global":
            global_settings = await self.repository.get_settings("global")
            if global_settings:
                settings.user_register = global_settings.user_register
                settings.otp_required = global_settings.otp_required
                settings.allow_multiple_sessions = global_settings.allow_multiple_sessions
                settings.session_duration = global_settings.session_duration
                settings.session_idle_timeout = global_settings.session_idle_timeout

        return settings

    async def update_settings(
        self, update_data: AdvancedSettingsUpdate, user_id: str = "global"
    ) -> AdvancedSettings:
        """설정 업데이트.

        - 글로벌(관리자): 모든 필드를 글로벌 문서에 저장.
        - 사용자: 개인 필드만 사용자 문서에 저장 (Repository 레이어에서 글로벌 필드 제거).
          저장 후 글로벌 필드를 병합하여 반환.
        """
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
            session_idle_timeout=update_data.session_idle_timeout,
            otp_required=update_data.otp_required,
        )
        saved = await self.repository.update_settings(settings)

        # 사용자 문서인 경우 글로벌 필드 병합 후 반환
        if user_id != "global":
            global_settings = await self.repository.get_settings("global")
            if global_settings:
                saved.user_register = global_settings.user_register
                saved.otp_required = global_settings.otp_required
                saved.allow_multiple_sessions = global_settings.allow_multiple_sessions
                saved.session_duration = global_settings.session_duration
                saved.session_idle_timeout = global_settings.session_idle_timeout

        return saved


advanced_settings_service = AdvancedSettingsService()
