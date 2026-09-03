"""Shared helpers for endpoint tests — auth dependency overrides.

Protected endpoints resolve the current profile via `get_current_profile`.
Tests override that dependency with a fixed profile instead of building
real sessions.
"""
import uuid
from datetime import datetime

from app.api.deps import get_current_profile, get_current_user
from app.main import app
from app.models import Profile, User


def override_auth(profile: Profile) -> None:
    """Make protected endpoints see `profile` as the session's profile."""
    user = User(
        id=profile.user_id or uuid.uuid4(),
        email="test@steerium.test",
        password_hash="not-a-real-hash",
        name=profile.name,
        created_at=datetime(2026, 9, 3),
    )
    app.dependency_overrides[get_current_profile] = lambda: profile
    app.dependency_overrides[get_current_user] = lambda: user
