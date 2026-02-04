from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class LogEntry(BaseModel):
    id: str = Field(..., alias="_id")
    index: str = Field(..., alias="_index")
    timestamp: datetime
    message: str
    source: dict = Field(..., alias="_source")

    class Config:
        populate_by_name = True

class LogStreamResponse(BaseModel):
    logs: List[LogEntry]
    last_timestamp: Optional[datetime] = None
