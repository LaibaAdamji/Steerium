"""Dashboard aggregation schema — combines slices of every domain."""
from __future__ import annotations

import uuid
from datetime import date
from typing import List, Optional

from pydantic import BaseModel


class MilestoneProgress(BaseModel):
    id: uuid.UUID
    title: str
    order: int
    completed: bool
    task_count: int
    completed_task_count: int


class GoalSummary(BaseModel):
    id: uuid.UUID
    title: str
    status: str
    milestones_completed: int
    milestones_total: int
    tasks_completed: int
    tasks_total: int
    milestones: List[MilestoneProgress] = []


class DeadlineItem(BaseModel):
    title: str
    due_date: Optional[date]
    source: str  # "roadmap" | "opportunity"
    item_id: uuid.UUID


class ApplicationPipeline(BaseModel):
    interested: int = 0
    preparing: int = 0
    applied: int = 0
    interview: int = 0
    accepted: int = 0
    rejected: int = 0
    total: int = 0


class SavedOpportunityItem(BaseModel):
    id: uuid.UUID
    title: str
    type: str
    organization: Optional[str] = None
    deadline: Optional[date] = None


class DashboardResponse(BaseModel):
    goal: Optional[GoalSummary] = None
    upcoming_deadlines: List[DeadlineItem] = []
    application_pipeline: ApplicationPipeline
    saved_opportunities: List[SavedOpportunityItem] = []
    ai_recommendation: Optional[str] = None
