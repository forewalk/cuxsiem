"""고급 설정 Service"""
from datetime import datetime
from app.repositories.advanced_settings import AdvancedSettingsRepository
from app.models.advanced_settings import AdvancedSettings
from app.schemas.advanced_settings import AdvancedSettingsUpdate

class AdvancedSettingsService:
    def __init__(self):
        self.repository = AdvancedSettingsRepository()

    async def get_settings(self) -> AdvancedSettings:
        """현재 설정 조회 (없으면 기본값 생성)"""
        settings = await self.repository.get_settings()
        if not settings:
            # 기본값 생성: 사용자 등록 비활성화
            settings = AdvancedSettings(
                user_register=False,
                updated_at=datetime.utcnow()
            )
            await self.repository.update_settings(settings)
        return settings

    async def update_settings(self, update_data: AdvancedSettingsUpdate) -> AdvancedSettings:
        """설정 업데이트"""
        settings = AdvancedSettings(
            user_register=update_data.user_register,
            updated_at=datetime.utcnow()
        )
        return await self.repository.update_settings(settings)

advanced_settings_service = AdvancedSettingsService()
