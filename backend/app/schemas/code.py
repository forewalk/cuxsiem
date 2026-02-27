from pydantic import BaseModel
from typing import List
from datetime import datetime

class CodeBase(BaseModel):
    id: str
    code_name: str

class CodeUpdate(CodeBase):
    pass

class CodeResponse(CodeBase):
    updated_at: datetime

    class Config:
        from_attributes = True

class CodeListResponse(BaseModel):
    codes: List[CodeResponse]
