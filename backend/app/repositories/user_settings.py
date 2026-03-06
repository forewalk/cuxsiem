import asyncio
from datetime import datetime
from typing import Any, Dict, Optional
from app.core.opensearch import get_opensearch_client

class UserSettingsRepository:
    def __init__(self):
        self.client = get_opensearch_client()
        self.index = "cs_user_settings"

    async def get_setting(self, user_id: str, setting_key: str) -> Optional[Dict[str, Any]]:
        loop = asyncio.get_event_loop()
        def search():
            doc_id = f"{user_id}_{setting_key}"
            try:
                res = self.client.get(index=self.index, id=doc_id)
                return res["_source"]
            except:
                return None
        return await loop.run_in_executor(None, search)

    async def save_setting(self, user_id: str, setting_key: str, setting_value: Any) -> bool:
        loop = asyncio.get_event_loop()
        def index():
            doc_id = f"{user_id}_{setting_key}"
            body = {
                "user_id": user_id,
                "setting_key": setting_key,
                "setting_value": setting_value,
                "updated_at": datetime.utcnow().isoformat()
            }
            try:
                self.client.index(index=self.index, id=doc_id, body=body, refresh=True)
                return True
            except:
                return False
        return await loop.run_in_executor(None, index)
