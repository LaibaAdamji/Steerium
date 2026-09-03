"""
Roadmap generation via the AI provider. Takes a Goal + its Profile, asks
Qwen for 4-6 milestones with concrete tasks, validates the shape, and
persists them as RoadmapItems (milestones + child tasks).

Regeneration replaces the goal's existing roadmap — `cascade="all,
delete-orphan"` on Goal.roadmap_items handles cleanup, but we delete
explicitly first so the fresh tree is built in one clean pass.
"""
import json
import uuid
from datetime import date
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models import Goal, Profile, RoadmapItem
from app.models.enums import Priority, RoadmapItemStatus, RoadmapItemType
from app.services.ai_provider import AIProvider, AIProviderError, get_ai_provider

VALID_PRIORITIES = {p.value for p in Priority}

SYSTEM_PROMPT = (
    "You are a pragmatic career planner. You produce realistic, specific, "
    "actionable roadmaps grounded in the user's actual background. "
    "Respond only with valid JSON matching the requested schema."
)


def _profile_context(profile: Profile) -> str:
    """Serialize the profile fields the planner actually needs."""
    return json.dumps(
        {
            "name": profile.name,
            "education": profile.education or {},
            "skills": profile.skills or [],
            "experience": profile.experience or [],
            "interests": profile.interests or [],
            "career_goals": profile.career_goals or "",
        },
        indent=2,
        default=str,
    )


def build_prompt(goal: Goal, profile: Profile) -> str:
    return f"""Create a career roadmap for the following goal.

USER PROFILE:
{_profile_context(profile)}

GOAL:
Title: {goal.title}
Description: {goal.description or "(none provided)"}
Target date: {goal.target_date or "(none provided)"}
Today's date: {date.today().isoformat()}

Return JSON with exactly this shape:
{{
  "milestones": [
    {{
      "title": "short milestone name",
      "description": "1-2 sentences on what this milestone achieves",
      "rationale": "1 sentence on why it matters for this specific goal and profile",
      "priority": "low" | "medium" | "high",
      "tasks": [
        {{
          "title": "concrete, doable task",
          "rationale": "1 short sentence on why"
        }}
      ]
    }}
  ]
}}

Rules:
- 4 to 6 milestones, ordered in the sequence the user should tackle them.
- 2 to 4 tasks per milestone, each concrete enough to start this week.
- Ground every milestone and task in the profile above (their skills, education, timeline). Do not invent credentials they already have.
- Prefer specifics over platitudes: "Shortlist 8 US universities with funded AI/ML labs and note their Dec 2027 deadlines" beats "Research universities".
- If the goal has a target date, sequence the milestones to land before it."""


def _clean_priority(value) -> str:
    if isinstance(value, str) and value.lower() in VALID_PRIORITIES:
        return value.lower()
    return Priority.medium.value


def validate_payload(data: dict) -> List[dict]:
    """Raise AIProviderError if the model's JSON doesn't match the contract."""
    milestones = data.get("milestones")
    if not isinstance(milestones, list) or not (4 <= len(milestones) <= 6):
        raise AIProviderError(
            f"Roadmap must contain 4-6 milestones, got {len(milestones) if isinstance(milestones, list) else type(milestones).__name__}"
        )

    cleaned = []
    for i, m in enumerate(milestones):
        if not isinstance(m, dict) or not m.get("title"):
            raise AIProviderError(f"Milestone #{i + 1} is missing a title")
        tasks = m.get("tasks")
        if not isinstance(tasks, list) or not (2 <= len(tasks) <= 4):
            raise AIProviderError(
                f"Milestone '{m['title']}' needs 2-4 tasks"
            )
        for j, t in enumerate(tasks):
            if not isinstance(t, dict) or not t.get("title"):
                raise AIProviderError(f"Task #{j + 1} of milestone '{m['title']}' is missing a title")
        cleaned.append(m)
    return cleaned


def generate_roadmap(
    goal: Goal,
    profile: Profile,
    db: Session,
    provider: Optional[AIProvider] = None,
) -> List[RoadmapItem]:
    """
    Generate and persist a roadmap for `goal`. Returns the new milestone
    RoadmapItems (with tasks accessible via `.children` after refresh).

    Raises AIProviderError if the model call or validation fails — the
    caller decides whether to fall back or surface the error.
    """
    provider = provider or get_ai_provider()
    data = provider.chat_json(build_prompt(goal, profile), system=SYSTEM_PROMPT)
    milestones = validate_payload(data)

    # Replace any existing roadmap in one clean pass.
    db.query(RoadmapItem).filter(RoadmapItem.goal_id == goal.id).delete()
    db.flush()

    created: List[RoadmapItem] = []
    for i, m in enumerate(milestones, start=1):
        milestone = RoadmapItem(
            goal_id=goal.id,
            type=RoadmapItemType.milestone,
            title=str(m["title"])[:255],
            description=m.get("description"),
            rationale=m.get("rationale"),
            order=i,
            priority=Priority(_clean_priority(m.get("priority"))),
            status=RoadmapItemStatus.not_started,
            completed=False,
        )
        db.add(milestone)
        db.flush()  # need milestone.id for parent_id

        for j, t in enumerate(m.get("tasks", []), start=1):
            db.add(RoadmapItem(
                goal_id=goal.id,
                parent_id=milestone.id,
                type=RoadmapItemType.task,
                title=str(t["title"])[:255],
                rationale=t.get("rationale"),
                order=j,
                priority=Priority(_clean_priority(m.get("priority"))),
                status=RoadmapItemStatus.not_started,
                completed=False,
            ))
        created.append(milestone)

    db.commit()
    for item in created:
        db.refresh(item)
    return created


def get_or_404_goal(db: Session, goal_id: uuid.UUID) -> Goal:
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal
