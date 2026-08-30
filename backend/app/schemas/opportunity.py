import uuid
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class OpportunityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    title: str
    organization: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    deadline: Optional[date] = None
    url: Optional[str] = None
    requirements: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    created_at: datetime
