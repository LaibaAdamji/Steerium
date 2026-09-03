import uuid
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.roadmap_item import MilestoneResponse


class GoalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    target_date: Optional[date] = None


class GoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    profile_id: uuid.UUID
    title: str
    description: Optional[str] = None
    target_date: Optional[date] = None
    status: str
    created_at: datetime
    updated_at: datetime
    milestones: List[MilestoneResponse] = []


class GoalListResponse(BaseModel):
    """Lighter list view — no nested roadmap tree."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: Optional[str] = None
    target_date: Optional[date] = None
    status: str
    created_at: datetime
