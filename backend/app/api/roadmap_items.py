"""
Roadmap item updates — lets the UI tick milestones/tasks complete, which
drives the dashboard progress counts. Keeps `completed` and `status` in
sync so the two fields never disagree. Items must belong to the
authenticated user's goal.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_profile
from app.models import Goal, Profile, RoadmapItem
from app.models.enums import RoadmapItemStatus
from app.schemas.roadmap_item import RoadmapItemUpdate, TaskResponse

router = APIRouter(prefix="/api", tags=["roadmap-items"])


def _sync_item(item: RoadmapItem, data: RoadmapItemUpdate) -> None:
    if data.completed is None and data.status is None:
        raise HTTPException(status_code=422, detail="Provide 'completed' and/or 'status'")

    if data.status is not None:
        try:
            item.status = RoadmapItemStatus(data.status)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status: {data.status}. Valid: {[s.value for s in RoadmapItemStatus]}",
            )
        item.completed = item.status == RoadmapItemStatus.completed

    if data.completed is not None:
        item.completed = data.completed
        # Only derive status when the caller didn't set it explicitly.
        if data.status is None:
            if data.completed:
                item.status = RoadmapItemStatus.completed
            elif item.status == RoadmapItemStatus.completed:
                item.status = RoadmapItemStatus.not_started


@router.patch("/roadmap-items/{item_id}", response_model=TaskResponse)
def update_roadmap_item(
    item_id: uuid.UUID,
    data: RoadmapItemUpdate,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Mark a milestone or task complete/incomplete (or set status directly)."""
    item = db.query(RoadmapItem).filter(RoadmapItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Roadmap item not found")

    # Ownership: the item's goal must belong to the current user's profile
    goal = db.query(Goal).filter(Goal.id == item.goal_id).first()
    if not goal or goal.profile_id != profile.id:
        raise HTTPException(status_code=404, detail="Roadmap item not found")

    _sync_item(item, data)
    db.commit()
    db.refresh(item)
    return TaskResponse.model_validate(item)
