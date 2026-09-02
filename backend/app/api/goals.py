"""Goal CRUD with nested roadmap milestone/task tree."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Goal, Profile
from app.models.enums import GoalStatus, RoadmapItemType
from app.schemas.goal import GoalCreate, GoalListResponse, GoalResponse
from app.services.ai_provider import AIProviderError
from app.services.roadmap_generator import generate_roadmap

router = APIRouter(prefix="/api", tags=["goals"])


def _build_goal_response(goal: Goal) -> GoalResponse:
    """Hydrate a GoalResponse with milestone → task tree from roadmap_items."""
    from app.schemas.roadmap_item import MilestoneResponse, TaskResponse

    milestones = [
        item for item in goal.roadmap_items if item.type == RoadmapItemType.milestone
    ]
    milestones.sort(key=lambda m: m.order)

    milestone_responses = []
    for m in milestones:
        tasks = sorted(
            [TaskResponse.model_validate(t) for t in m.children],
            key=lambda t: t.order,
        )
        milestone_responses.append(
            MilestoneResponse(
                id=m.id,
                title=m.title,
                description=m.description,
                rationale=m.rationale,
                order=m.order,
                priority=m.priority.value,
                status=m.status.value,
                due_date=m.due_date,
                completed=m.completed,
                tasks=tasks,
            )
        )

    return GoalResponse(
        id=goal.id,
        profile_id=goal.profile_id,
        title=goal.title,
        description=goal.description,
        target_date=goal.target_date,
        status=goal.status.value,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
        milestones=milestone_responses,
    )


@router.get("/goals", response_model=list[GoalListResponse])
def list_goals(profile_id: uuid.UUID | None = None, db: Session = Depends(get_db)):
    q = db.query(Goal)
    if profile_id:
        q = q.filter(Goal.profile_id == profile_id)
    goals = q.order_by(Goal.created_at.desc()).all()
    return [
        GoalListResponse(
            id=g.id,
            title=g.title,
            description=g.description,
            target_date=g.target_date,
            status=g.status.value,
            created_at=g.created_at,
        )
        for g in goals
    ]


@router.post("/goals", response_model=GoalResponse, status_code=201)
def create_goal(data: GoalCreate, db: Session = Depends(get_db)):
    goal = Goal(
        profile_id=data.profile_id,
        title=data.title,
        description=data.description,
        target_date=data.target_date,
        status=GoalStatus.active,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _build_goal_response(goal)


@router.get("/goals/{goal_id}", response_model=GoalResponse)
def get_goal(goal_id: uuid.UUID, db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return _build_goal_response(goal)


@router.post("/goals/{goal_id}/generate-roadmap", response_model=GoalResponse)
def generate_goal_roadmap(goal_id: uuid.UUID, db: Session = Depends(get_db)):
    """
    Generate (or regenerate) the goal's roadmap with Qwen. Replaces any
    existing roadmap for the goal. Returns the full goal with its new
    milestone → task tree.
    """
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    profile = db.query(Profile).filter(Profile.id == goal.profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found for this goal")

    try:
        generate_roadmap(goal, profile, db)
    except AIProviderError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Roadmap generation failed: {exc}. The existing roadmap (if any) was kept.",
        )

    db.refresh(goal)
    return _build_goal_response(goal)
