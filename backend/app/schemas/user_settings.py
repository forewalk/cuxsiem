from pydantic import BaseModel
from typing import Any, Dict

class UserSettingBase(BaseModel):
    setting_key: str
    setting_value: Any

class UserSettingUpdate(UserSettingBase):
    pass

class UserSettingResponse(UserSettingBase):
    user_id: str
