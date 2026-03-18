"""고급 설정 Repository"""
import asyncio
from typing import Optional
from datetime import datetime

from app.core.opensearch import get_opensearch_client
from app.models.advanced_settings import AdvancedSettings, PERSONAL_FIELDS


class AdvancedSettingsRepository:
    """고급 설정 관리"""

    def __init__(self):
        self.client = get_opensearch_client()
        self.index = "cs_policies"
        self.default_doc_id = "advanced_settings"

    def _get_doc_id(self, user_id: str) -> str:
        """사용자별 문서 ID 생성"""
        if user_id == "global":
            return self.default_doc_id
        return f"advanced_settings_{user_id}"

    async def get_settings(self, user_id: str = "global") -> Optional[AdvancedSettings]:
        """설정 조회"""
        loop = asyncio.get_event_loop()
        doc_id = self._get_doc_id(user_id)

        def get():
            try:
                result = self.client.get(index=self.index, id=doc_id)
                data = result["_source"]
                return AdvancedSettings(
                    user_register=data.get("user_register", False),
                    allow_multiple_sessions=data.get("allow_multiple_sessions", False),
                    tab_count=data.get("tab_count", 10),
                    updated_at=datetime.fromisoformat(data["updated_at"]),
                    user_id=data.get("user_id", user_id),
                    pagination_size=data.get("pagination_size", 10),
                    time_filter_duration=data.get("time_filter_duration", 15),
                    time_filter_unit=data.get("time_filter_unit", "m"),
                    pixel_mode=data.get("pixel_mode", False),
                    log_stream_size=data.get("log_stream_size", 1000),
                    log_stream_refresh=data.get("log_stream_refresh", 10),
                    session_duration=data.get("session_duration", 30),
                    session_idle_timeout=data.get("session_idle_timeout", 0),
                    otp_required=data.get("otp_required", False),
                )
            except Exception:
                return None

        return await loop.run_in_executor(None, get)

    async def update_settings(self, settings: AdvancedSettings) -> AdvancedSettings:
        """설정 업데이트.

        글로벌 문서(user_id='global')는 모든 필드를 저장.
        사용자 문서는 개인화 필드(PERSONAL_FIELDS)만 저장 — 글로벌 필드 중복 저장 방지.
        """
        loop = asyncio.get_event_loop()
        doc_id = self._get_doc_id(settings.user_id)
        full_dict = settings.to_dict()

        if settings.user_id == "global":
            body = full_dict
        else:
            # 개인 설정 필드 + 메타 필드만 저장
            body = {k: v for k, v in full_dict.items()
                    if k in PERSONAL_FIELDS or k in ('user_id', 'updated_at')}

        def upsert():
            self.client.index(
                index=self.index,
                id=doc_id,
                body=body,
                refresh=True
            )
            return settings

        return await loop.run_in_executor(None, upsert)
