from app.repositories.user_settings import UserSettingsRepository
from typing import Any, Optional

class UserSettingsService:
    def __init__(self):
        self.repository = UserSettingsRepository()

    async def get_user_setting(self, user_id: str, setting_key: str) -> Optional[Any]:
        data = await self.repository.get_setting(user_id, setting_key)
        return data["setting_value"] if data else None

    async def save_user_setting(self, user_id: str, setting_key: str, setting_value: Any) -> bool:
        return await self.repository.save_setting(user_id, setting_key, setting_value)
