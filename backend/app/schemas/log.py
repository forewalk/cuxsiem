from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class LogEntry(BaseModel):
    id: str = Field(..., alias="_id")
    index: str = Field(..., alias="_index")
    timestamp: datetime
    message: str
    source: dict = Field(..., alias="_source")

    model_config = {
        "populate_by_name": True,
        "from_attributes": True
    }

class LogStreamResponse(BaseModel):
    logs: List[LogEntry]
    last_timestamp: Optional[datetime] = None

    model_config = {
        "populate_by_name": True,
        "from_attributes": True
    }
