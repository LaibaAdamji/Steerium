"""
PATCH /api/roadmap-items/{id} — completion toggling with status sync.
"""
import uuid
from datetime import datetime
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app
from app.models import RoadmapItem
from app.models.enums import Priority, RoadmapItemStatus, RoadmapItemType

client = TestClient(app)


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


def _override_db(db):
    app.dependency_overrides[get_db] = lambda: db


def _mock_db(item):
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = item
    return db


def teardown_function():
    app.dependency_overrides.clear()


def test_patch_completes_item_and_syncs_status():
    item = make_item()
    db = _mock_db(item)
    _override_db(db)

    response = client.patch(f"/api/roadmap-items/{item.id}", json={"completed": True})

    assert response.status_code == 200
    assert item.completed is True
    assert item.status == RoadmapItemStatus.completed
    assert response.json()["completed"] is True
    db.commit.assert_called_once()


def test_patch_uncompletes_item_resets_status():
    item = make_item(completed=True, status=RoadmapItemStatus.completed)
    db = _mock_db(item)
    _override_db(db)

    response = client.patch(f"/api/roadmap-items/{item.id}", json={"completed": False})

    assert response.status_code == 200
    assert item.completed is False
    assert item.status == RoadmapItemStatus.not_started


def test_patch_explicit_status_overrides_derivation():
    item = make_item()
    db = _mock_db(item)
    _override_db(db)

    response = client.patch(
        f"/api/roadmap-items/{item.id}",
        json={"status": "in_progress"},
    )

    assert response.status_code == 200
    assert item.status == RoadmapItemStatus.in_progress
    assert item.completed is False  # derived from non-completed status


def test_patch_rejects_invalid_status():
    item = make_item()
    db = _mock_db(item)
    _override_db(db)

    response = client.patch(f"/api/roadmap-items/{item.id}", json={"status": "done-ish"})

    assert response.status_code == 400
    assert "Invalid status" in response.json()["detail"]


def test_patch_rejects_empty_body():
    item = make_item()
    db = _mock_db(item)
    _override_db(db)

    response = client.patch(f"/api/roadmap-items/{item.id}", json={})

    assert response.status_code == 422


def test_patch_404_unknown_item():
    db = _mock_db(None)
    _override_db(db)

    response = client.patch(f"/api/roadmap-items/{uuid.uuid4()}", json={"completed": True})

    assert response.status_code == 404
