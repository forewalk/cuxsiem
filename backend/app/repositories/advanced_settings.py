"""고급 설정 Repository"""
import asyncio
from typing import Optional
from datetime import datetime

from app.core.opensearch import get_opensearch_client
from app.models.advanced_settings import AdvancedSettings


class AdvancedSettingsRepository:
    """고급 설정 관리"""

    def __init__(self):
        self.client = get_opensearch_client()
        self.index = "cs_policies"
        self.doc_id = "advanced_settings"

    async def get_settings(self) -> Optional[AdvancedSettings]:
        """설정 조회"""
        loop = asyncio.get_event_loop()

        def get():
            try:
                # 'advanced_settings' ID를 가진 문서를 가져옴
                result = self.client.get(index=self.index, id=self.doc_id)
                data = result["_source"]
                return AdvancedSettings(
                    user_register=data.get("user_register", False),
                    allow_multiple_sessions=data.get("allow_multiple_sessions", False),
                    tab_count=data.get("tab_count", 10),
                    updated_at=datetime.fromisoformat(data["updated_at"]),
                    pagination_size=data.get("pagination_size", 10),
                    time_filter_duration=data.get("time_filter_duration", 15),
                    time_filter_unit=data.get("time_filter_unit", "m")
                )
            except Exception:
                return None

        return await loop.run_in_executor(None, get)

    async def update_settings(self, settings: AdvancedSettings) -> AdvancedSettings:
        """설정 업데이트"""
        loop = asyncio.get_event_loop()

        def upsert():
            self.client.index(
                index=self.index,
                id=self.doc_id,
                body=settings.to_dict(),
                refresh=True
            )
            return settings

        return await loop.run_in_executor(None, upsert)
