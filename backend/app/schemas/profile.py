import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class ProfileCreate(BaseModel):
    name: str
    education: Optional[dict] = None
    skills: Optional[List[str]] = None
    experience: Optional[List[dict]] = None
    interests: Optional[List[str]] = None
    career_goals: Optional[str] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    education: Optional[dict] = None
    skills: Optional[List[str]] = None
    experience: Optional[List[dict]] = None
    interests: Optional[List[str]] = None
    career_goals: Optional[str] = None


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    education: Optional[dict] = None
    skills: Optional[List[str]] = None
    experience: Optional[List[dict]] = None
    interests: Optional[List[str]] = None
    career_goals: Optional[str] = None
    created_at: datetime
    updated_at: datetime
