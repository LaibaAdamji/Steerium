"""
Dashboard aggregation — pulls from the authenticated user's profile, goals,
roadmap_items, opportunities, saved_opportunities, and applications.
Returns everything the dashboard shell needs in one round trip.
"""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_profile
from app.models import (
    Application,
    Goal,
    Opportunity,
    Profile,
    RoadmapItem,
    SavedOpportunity,
)
from app.models.enums import GoalStatus, RoadmapItemType
from app.schemas.dashboard import (
    ApplicationPipeline,
    DashboardResponse,
    DeadlineItem,
    GoalSummary,
    MilestoneProgress,
    NextTask,
    SavedOpportunityItem,
)

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    pid = profile.id

    # --- Active goal + roadmap progress ---
    goal = (
        db.query(Goal)
        .filter(Goal.profile_id == pid, Goal.status == GoalStatus.active)
        .first()
    )

    goal_summary = None
    next_task: NextTask | None = None
    upcoming_deadlines: list[DeadlineItem] = []

    if goal:
        milestones = (
            db.query(RoadmapItem)
            .filter(
                RoadmapItem.goal_id == goal.id,
                RoadmapItem.type == RoadmapItemType.milestone,
            )
            .order_by(RoadmapItem.order)
            .all()
        )
        tasks = (
            db.query(RoadmapItem)
            .filter(
                RoadmapItem.goal_id == goal.id,
                RoadmapItem.type == RoadmapItemType.task,
            )
            .all()
        )

        milestone_progress = []
        milestones_done = 0
        for m in milestones:
            child_ids = [c.id for c in m.children]
            m_tasks = [t for t in tasks if t.id in child_ids]
            completed_tasks = sum(1 for t in m_tasks if t.completed)
            if m.completed:
                milestones_done += 1
            milestone_progress.append(
                MilestoneProgress(
                    id=m.id,
                    title=m.title,
                    order=m.order,
                    completed=m.completed,
                    task_count=len(m_tasks),
                    completed_task_count=completed_tasks,
                )
            )

        tasks_done = sum(1 for t in tasks if t.completed)

        goal_summary = GoalSummary(
            id=goal.id,
            title=goal.title,
            description=goal.description,
            target_date=goal.target_date,
            status=goal.status.value,
            milestones_completed=milestones_done,
            milestones_total=len(milestones),
            tasks_completed=tasks_done,
            tasks_total=len(tasks),
            milestones=milestone_progress,
        )

        # Next action: first incomplete task, in milestone order then task order
        milestone_order = {m.id: m.order for m in milestones}
        incomplete = sorted(
            (t for t in tasks if not t.completed),
            key=lambda t: (milestone_order.get(t.parent_id, 999), t.order),
        )
        if incomplete:
            t = incomplete[0]
            milestone = next((m for m in milestones if m.id == t.parent_id), None)
            next_task = NextTask(
                id=t.id,
                title=t.title,
                milestone_title=milestone.title if milestone else None,
                rationale=t.rationale,
                priority=t.priority.value,
                due_date=t.due_date,
            )

        # Roadmap deadlines (tasks + milestones with due_date, not completed)
        for item in (milestones + tasks):
            if item.due_date and not item.completed:
                upcoming_deadlines.append(
                    DeadlineItem(
                        title=item.title,
                        due_date=item.due_date,
                        source="roadmap",
                        item_id=item.id,
                    )
                )

    # --- Opportunity deadlines (curated catalog, shown to everyone) ---
    opp_deadlines = (
        db.query(Opportunity)
        .filter(Opportunity.deadline >= date.today())
        .order_by(Opportunity.deadline.asc())
        .limit(10)
        .all()
    )
    for opp in opp_deadlines:
        upcoming_deadlines.append(
            DeadlineItem(
                title=f"{opp.title} — {opp.organization or 'TBD'}",
                due_date=opp.deadline,
                source="opportunity",
                item_id=opp.id,
            )
        )

    # Sort all deadlines chronologically, take top 10
    upcoming_deadlines.sort(key=lambda d: d.due_date or date.max)
    upcoming_deadlines = upcoming_deadlines[:10]

    # --- Application pipeline ---
    apps = db.query(Application).filter(Application.profile_id == pid).all()
    counts: dict[str, int] = {}
    for a in apps:
        counts[a.status.value] = counts.get(a.status.value, 0) + 1

    pipeline = ApplicationPipeline(
        interested=counts.get("interested", 0),
        preparing=counts.get("preparing", 0),
        applied=counts.get("applied", 0),
        interview=counts.get("interview", 0),
        accepted=counts.get("accepted", 0),
        rejected=counts.get("rejected", 0),
        total=len(apps),
    )

    # --- Saved opportunities (not yet applied) ---
    applied_opp_ids = {a.opportunity_id for a in apps}
    saved_rows = (
        db.query(SavedOpportunity)
        .filter(SavedOpportunity.profile_id == pid)
        .all()
    )
    saved_opportunities: list[SavedOpportunityItem] = []
    for s in saved_rows:
        if s.opportunity_id in applied_opp_ids:
            continue
        opp = db.query(Opportunity).filter(Opportunity.id == s.opportunity_id).first()
        if opp:
            saved_opportunities.append(
                SavedOpportunityItem(
                    id=opp.id,
                    title=opp.title,
                    type=opp.type.value,
                    organization=opp.organization,
                    deadline=opp.deadline,
                )
            )

    return DashboardResponse(
        profile_name=profile.name,
        goal=goal_summary,
        next_task=next_task,
        upcoming_deadlines=upcoming_deadlines,
        application_pipeline=pipeline,
        saved_opportunities=saved_opportunities,
        ai_recommendation=None,  # populated by AI layer later
    )
