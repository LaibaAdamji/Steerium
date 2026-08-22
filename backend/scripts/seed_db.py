"""
Seeds the database so the demo is populated on first run — judges should
never see an empty app or have to manually enter data first.

Idempotent: safe to run multiple times. Run from backend/:

    python -m scripts.seed_db
"""
import json
from pathlib import Path

from app.core.database import SessionLocal
from app.models import Goal, Opportunity, Profile, RoadmapItem
from app.models.enums import GoalStatus, Priority, RoadmapItemType

DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "opportunities.json"

DEMO_PROFILE_NAME = "Ayesha Khan (Demo)"


def seed_opportunities(db):
    if not DATA_FILE.exists():
        print(f"No opportunities file found at {DATA_FILE}, skipping.")
        return

    existing_titles = {(o.title, o.organization) for o in db.query(Opportunity).all()}
    records = json.loads(DATA_FILE.read_text())

    created = 0
    for rec in records:
        key = (rec["title"], rec.get("organization"))
        if key in existing_titles:
            continue
        deadline = rec.get("deadline") or None
        db.add(Opportunity(
            type=rec["type"],
            title=rec["title"],
            organization=rec.get("organization"),
            description=rec.get("description"),
            location=rec.get("location"),
            deadline=deadline,
            url=rec.get("url") or None,
            requirements=rec.get("requirements", []),
            tags=rec.get("tags", []),
        ))
        created += 1
    db.commit()
    print(f"Seeded {created} new opportunities ({len(existing_titles)} already existed).")


def seed_demo_profile(db) -> Profile:
    profile = db.query(Profile).filter(Profile.name == DEMO_PROFILE_NAME).first()
    if profile:
        print("Demo profile already exists, reusing it.")
        return profile

    profile = Profile(
        name=DEMO_PROFILE_NAME,
        education={
            "degree": "BS Computer Science (in progress)",
            "institution": "FAST-NUCES",
            "year": "Expected 2028",
        },
        skills=["Python", "JavaScript", "React", "SQL", "FastAPI"],
        experience=[
            {
                "title": "Software Engineering Intern",
                "org": "Local Tech Startup",
                "description": "Built internal tooling and REST APIs.",
                "dates": "Summer 2026",
            }
        ],
        interests=["AI", "Software Engineering", "Research"],
        career_goals="Pursue a fully funded Master's in Computer Science abroad, "
                     "specializing in AI/ML, then work as an ML engineer or researcher.",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    print(f"Created demo profile: {profile.name} ({profile.id})")
    return profile


def seed_demo_goal_and_roadmap(db, profile: Profile):
    existing = db.query(Goal).filter(Goal.profile_id == profile.id).first()
    if existing:
        print("Demo goal already exists, reusing it.")
        return existing

    goal = Goal(
        profile_id=profile.id,
        title="MS in Computer Science — Fall 2028",
        description="Fully funded Master's program abroad with an AI/ML focus.",
        status=GoalStatus.active,
    )
    db.add(goal)
    db.flush()

    # Seeded fallback roadmap — also what the roadmap endpoint should return
    # if the Qwen call fails or times out (see spec's error-handling rule).
    milestones = [
        {
            "title": "Strengthen academic profile",
            "priority": Priority.high,
            "tasks": ["Raise GPA in core CS courses", "Take on a research assistantship or independent study"],
        },
        {
            "title": "Build a standout project portfolio",
            "priority": Priority.high,
            "tasks": ["Ship 2-3 substantial projects on GitHub", "Contribute to an open-source ML/AI project"],
        },
        {
            "title": "Prepare standardized tests & English proficiency",
            "priority": Priority.medium,
            "tasks": ["Register for GRE (if required by target programs)", "Take IELTS/TOEFL"],
        },
        {
            "title": "Secure strong recommendation letters",
            "priority": Priority.medium,
            "tasks": ["Identify 2-3 potential recommenders", "Share CV and goals with each recommender early"],
        },
        {
            "title": "Research and shortlist programs & scholarships",
            "priority": Priority.high,
            "tasks": ["Shortlist 6-8 target universities", "Identify 3-5 relevant fully funded scholarships"],
        },
        {
            "title": "Prepare and submit applications",
            "priority": Priority.high,
            "tasks": ["Draft statement of purpose", "Submit applications ahead of deadlines"],
        },
    ]

    for i, m in enumerate(milestones, start=1):
        milestone = RoadmapItem(
            goal_id=goal.id,
            type=RoadmapItemType.milestone,
            title=m["title"],
            priority=m["priority"],
            order=i,
        )
        db.add(milestone)
        db.flush()
        for j, task_title in enumerate(m["tasks"], start=1):
            db.add(RoadmapItem(
                goal_id=goal.id,
                parent_id=milestone.id,
                type=RoadmapItemType.task,
                title=task_title,
                order=j,
            ))

    db.commit()
    print(f"Created demo goal with {len(milestones)} milestones.")
    return goal


def main():
    db = SessionLocal()
    try:
        seed_opportunities(db)
        profile = seed_demo_profile(db)
        seed_demo_goal_and_roadmap(db, profile)
    finally:
        db.close()


if __name__ == "__main__":
    main()
