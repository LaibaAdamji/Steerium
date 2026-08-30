"""Shared roadmap-item schemas. Imported by goal.py to avoid circular deps."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: Optional[str] = None
    rationale: Optional[str] = None
    order: int
    priority: str
    status: str
    due_date: Optional[date] = None
    completed: bool = False


class MilestoneResponse(BaseModel):
    """Milestone with nested tasks (children)."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: Optional[str] = None
    rationale: Optional[str] = None
    order: int
    priority: str
    status: str
    due_date: Optional[date] = None
    completed: bool = False
    tasks: List[TaskResponse] = []
