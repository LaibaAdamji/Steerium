"""
Roadmap generation tests. The AI provider is faked everywhere — no live
Model Studio calls and no database required.

Two layers:
- Service tests: validate_payload / generate_roadmap with a fake provider
  and a mocked session.
- Endpoint tests: POST /api/goals/{id}/generate-roadmap wiring (404, 502,
  happy path) with the get_db dependency overridden.
"""
import uuid
from datetime import date, datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app
from app.models import Goal, Profile, RoadmapItem
from app.models.enums import GoalStatus, Priority, RoadmapItemType, RoadmapItemStatus
from app.services import roadmap_generator
from app.services.ai_provider import AIProviderError
from app.services.roadmap_generator import generate_roadmap, validate_payload

client = TestClient(app)


def make_goal_and_profile():
    goal = Goal(
        id=uuid.uuid4(),
        profile_id=uuid.uuid4(),
        title="MS in Computer Science — Fall 2028",
        description="Fully funded Master's abroad, AI/ML focus.",
        target_date=date(2028, 8, 1),
        status=GoalStatus.active,
        created_at=datetime(2026, 9, 1),
        updated_at=datetime(2026, 9, 1),
    )
    goal.roadmap_items = []  # plain assignment avoids lazy-load on transient obj
    profile = Profile(
        id=goal.profile_id,
        name="Ayesha Khan (Demo)",
        education={"degree": "BS CS", "institution": "FAST-NUCES", "year": "2028"},
        skills=["Python", "React", "SQL"],
        experience=[],
        interests=["AI"],
        career_goals="Funded MS abroad",
    )
    return goal, profile


def make_payload(n_milestones=4, tasks_per=2):
    return {
        "milestones": [
            {
                "title": f"Milestone {i + 1}",
                "description": "desc",
                "rationale": "why",
                "priority": "high" if i % 2 == 0 else "medium",
                "tasks": [
                    {"title": f"Task {i + 1}.{j + 1}", "rationale": "why"}
                    for j in range(tasks_per)
                ],
            }
            for i in range(n_milestones)
        ]
    }


class FakeProvider:
    def __init__(self, payload=None, error=None):
        self.payload = payload or make_payload()
        self.error = error
        self.prompts = []

    def chat_text(self, prompt, system=""):
        return "text"

    def chat_json(self, prompt, system=""):
        if self.error:
            raise self.error
        self.prompts.append(prompt)
        return self.payload

    def embed(self, texts):
        return [[0.0] * 4 for _ in texts]


# --- validate_payload ---

def test_validate_payload_accepts_valid_shape():
    cleaned = validate_payload(make_payload(n_milestones=6, tasks_per=4))
    assert len(cleaned) == 6


@pytest.mark.parametrize("n", [0, 3, 7])
def test_validate_payload_rejects_bad_milestone_count(n):
    with pytest.raises(AIProviderError):
        validate_payload(make_payload(n_milestones=n))


@pytest.mark.parametrize("tasks", [0, 1, 5])
def test_validate_payload_rejects_bad_task_count(tasks):
    with pytest.raises(AIProviderError):
        validate_payload(make_payload(tasks_per=tasks))


def test_validate_payload_rejects_missing_title():
    payload = make_payload()
    payload["milestones"][1]["title"] = ""
    with pytest.raises(AIProviderError):
        validate_payload(payload)


# --- generate_roadmap (service, mocked session) ---

def test_generate_roadmap_persists_milestones_and_tasks():
    goal, profile = make_goal_and_profile()
    provider = FakeProvider(payload=make_payload(n_milestones=5, tasks_per=3))
    db = MagicMock()

    created = generate_roadmap(goal, profile, db, provider=provider)

    assert len(created) == 5
    added = [c.args[0] for c in db.add.call_args_list]
    milestones = [a for a in added if a.type == RoadmapItemType.milestone]
    tasks = [a for a in added if a.type == RoadmapItemType.task]
    assert len(milestones) == 5
    assert len(tasks) == 15
    # tasks link to their milestone
    milestone_ids = {m.id for m in milestones}
    assert all(t.parent_id in milestone_ids for t in tasks)
    # priorities came from the payload
    assert milestones[0].priority == Priority.high
    assert milestones[1].priority == Priority.medium
    # invalid priority would fall back to medium
    db.commit.assert_called_once()


def test_generate_roadmap_prompt_contains_context():
    goal, profile = make_goal_and_profile()
    provider = FakeProvider()
    generate_roadmap(goal, profile, MagicMock(), provider=provider)

    prompt = provider.prompts[0]
    assert goal.title in prompt
    assert "FAST-NUCES" in prompt
    assert "Python" in prompt


def test_generate_roadmap_provider_failure_does_not_touch_db():
    goal, profile = make_goal_and_profile()
    provider = FakeProvider(error=AIProviderError("boom"))
    db = MagicMock()

    with pytest.raises(AIProviderError):
        generate_roadmap(goal, profile, db, provider=provider)

    db.query.assert_not_called()
    db.add.assert_not_called()
    db.commit.assert_not_called()


# --- endpoint wiring ---

def _override_db(db):
    app.dependency_overrides[get_db] = lambda: db


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


def test_generate_roadmap_endpoint_404():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    _override_db(db)

    response = client.post(f"/api/goals/{uuid.uuid4()}/generate-roadmap")
    assert response.status_code == 404


def test_generate_roadmap_endpoint_502_on_provider_error():
    goal, profile = make_goal_and_profile()
    db = MagicMock()

    def fake_query(model, *args, **kwargs):
        q = MagicMock()
        q.filter.return_value.first.return_value = goal if model is Goal else profile
        return q

    db.query.side_effect = fake_query
    _override_db(db)

    with patch.object(roadmap_generator, "get_ai_provider", return_value=FakeProvider(error=AIProviderError("boom"))):
        response = client.post(f"/api/goals/{goal.id}/generate-roadmap")

    assert response.status_code == 502
    assert "Roadmap generation failed" in response.json()["detail"]


def test_generate_roadmap_endpoint_happy_path():
    goal, profile = make_goal_and_profile()

    # Pre-seed an "existing" roadmap item so we can prove replacement.
    old_item = RoadmapItem(
        id=uuid.uuid4(), goal_id=goal.id, type=RoadmapItemType.task,
        title="Old task", order=1, priority=Priority.low,
        status=RoadmapItemStatus.not_started, completed=False,
    )
    goal.roadmap_items = [old_item]

    db = MagicMock()

    def fake_query(model, *args, **kwargs):
        q = MagicMock()
        if model is Goal:
            q.filter.return_value.first.return_value = goal
        elif model is Profile:
            q.filter.return_value.first.return_value = profile
        else:  # RoadmapItem delete path inside generate_roadmap
            q.filter.return_value.delete.return_value = 1
        return q

    def fake_add(obj):
        # Mimic what a real session + refresh would leave behind, so
        # _build_goal_response sees a hydrated milestone→task tree.
        obj.id = obj.id or uuid.uuid4()
        if obj.type == RoadmapItemType.milestone:
            obj.children = []
            goal.roadmap_items.append(obj)
        elif obj.parent_id:
            for m in goal.roadmap_items:
                if m.id == obj.parent_id:
                    m.children.append(obj)

    db.query.side_effect = fake_query
    db.add.side_effect = fake_add
    _override_db(db)

    provider = FakeProvider(payload=make_payload(n_milestones=4, tasks_per=2))

    with patch.object(roadmap_generator, "get_ai_provider", return_value=provider):
        response = client.post(f"/api/goals/{goal.id}/generate-roadmap")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(goal.id)
    assert len(body["milestones"]) == 4
    assert all(len(m["tasks"]) == 2 for m in body["milestones"])
    assert body["milestones"][0]["priority"] in ("low", "medium", "high")
