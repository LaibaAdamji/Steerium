"""
PATCH /api/roadmap-items/{id} — completion toggling with status sync.
"""
import uuid
from datetime import datetime
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app
from app.models import Goal, Profile, RoadmapItem
from app.models.enums import GoalStatus, Priority, RoadmapItemStatus, RoadmapItemType
from tests.conftest import override_auth

client = TestClient(app)


PROFILE_ID = uuid.uuid4()


def make_item(completed=False, status=RoadmapItemStatus.not_started) -> RoadmapItem:
    return RoadmapItem(
        id=uuid.uuid4(),
        goal_id=uuid.uuid4(),
        parent_id=None,
        type=RoadmapItemType.task,
        title="Take IELTS",
        order=1,
        priority=Priority.medium,
        status=status,
        completed=completed,
        created_at=datetime(2026, 9, 3),
        updated_at=datetime(2026, 9, 3),
    )


def make_profile() -> Profile:
    return Profile(id=PROFILE_ID, name="Test User")


def make_goal(goal_id) -> Goal:
    return Goal(
        id=goal_id,
        profile_id=PROFILE_ID,
        title="MS in Computer Science",
        status=GoalStatus.active,
    )


def _override_db(db):
    app.dependency_overrides[get_db] = lambda: db


def _mock_db(item):
    """Session where RoadmapItem and its owning Goal both resolve."""
    goal = make_goal(item.goal_id)
    db = MagicMock()

    def fake_query(model, *args, **kwargs):
        q = MagicMock()
        q.filter.return_value.first.return_value = item if model is RoadmapItem else goal
        return q

    db.query.side_effect = fake_query
    return db


def _setup(item):
    """Override db + auth, return the db mock for assertions."""
    db = _mock_db(item)
    _override_db(db)
    override_auth(make_profile())
    return db


def teardown_function():
    app.dependency_overrides.clear()


def test_patch_completes_item_and_syncs_status():
    item = make_item()
    db = _setup(item)

    response = client.patch(f"/api/roadmap-items/{item.id}", json={"completed": True})

    assert response.status_code == 200
    assert item.completed is True
    assert item.status == RoadmapItemStatus.completed
    assert response.json()["completed"] is True
    db.commit.assert_called_once()


def test_patch_uncompletes_item_resets_status():
    item = make_item(completed=True, status=RoadmapItemStatus.completed)
    db = _setup(item)

    response = client.patch(f"/api/roadmap-items/{item.id}", json={"completed": False})

    assert response.status_code == 200
    assert item.completed is False
    assert item.status == RoadmapItemStatus.not_started


def test_patch_explicit_status_overrides_derivation():
    item = make_item()
    db = _setup(item)

    response = client.patch(
        f"/api/roadmap-items/{item.id}",
        json={"status": "in_progress"},
    )

    assert response.status_code == 200
    assert item.status == RoadmapItemStatus.in_progress
    assert item.completed is False  # derived from non-completed status


def test_patch_rejects_invalid_status():
    item = make_item()
    db = _setup(item)

    response = client.patch(f"/api/roadmap-items/{item.id}", json={"status": "done-ish"})

    assert response.status_code == 400
    assert "Invalid status" in response.json()["detail"]


def test_patch_rejects_empty_body():
    item = make_item()
    db = _setup(item)

    response = client.patch(f"/api/roadmap-items/{item.id}", json={})

    assert response.status_code == 422


def test_patch_404_unknown_item():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    _override_db(db)
    override_auth(make_profile())

    response = client.patch(f"/api/roadmap-items/{uuid.uuid4()}", json={"completed": True})

    assert response.status_code == 404


def test_patch_404_when_item_belongs_to_another_user():
    """Cross-user access: item exists but its goal belongs to another profile."""
    item = make_item()
    foreign_goal = Goal(
        id=item.goal_id,
        profile_id=uuid.uuid4(),  # someone else's profile
        title="Someone else's goal",
        status=GoalStatus.active,
    )
    db = MagicMock()

    def fake_query(model, *args, **kwargs):
        q = MagicMock()
        q.filter.return_value.first.return_value = item if model is RoadmapItem else foreign_goal
        return q

    db.query.side_effect = fake_query
    _override_db(db)
    override_auth(make_profile())

    response = client.patch(f"/api/roadmap-items/{item.id}", json={"completed": True})

    assert response.status_code == 404
