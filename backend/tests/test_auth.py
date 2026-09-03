"""
Auth flow tests: password hashing primitives plus the signup/login/logout/me
endpoint wiring. The DB session is mocked — no real Postgres needed. A fresh
TestClient per test keeps session cookies isolated.
"""
import uuid
from datetime import datetime
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.main import app
from app.models import Profile, User


# --- password hashing primitives ---

def test_hash_password_is_salt_random_and_verifiable():
    h1 = hash_password("correct horse battery staple")
    h2 = hash_password("correct horse battery staple")
    assert h1 != h2  # fresh salt each time
    assert h1 != "correct horse battery staple"  # never plaintext
    assert verify_password("correct horse battery staple", h1)
    assert not verify_password("wrong password", h1)


def test_verify_password_rejects_malformed_hash():
    assert not verify_password("anything", "not-a-bcrypt-hash")


# --- endpoint wiring ---

def make_user(email="laiba@example.com", password="supersecret123"):
    return User(
        id=uuid.uuid4(),
        email=email,
        password_hash=hash_password(password),
        name="Laiba",
        created_at=datetime(2026, 9, 1),
        updated_at=datetime(2026, 9, 1),
    )


def make_db(state: dict) -> MagicMock:
    """
    Mock session where:
      - User lookups by email return state["existing_user"] (signup/login dupe check)
      - User lookups by id return state["user"] (session resolution)
      - Profile lookups by user_id return state["profile"]
      - db.add assigns ids/timestamps so responses validate
    """
    db = MagicMock()

    def fake_add(obj):
        obj.id = obj.id or uuid.uuid4()
        if getattr(obj, "created_at", None) is None:
            obj.created_at = datetime(2026, 9, 3)
        if getattr(obj, "updated_at", None) is None:
            obj.updated_at = datetime(2026, 9, 3)
        state.setdefault("created", []).append(obj)

    def fake_query(model, *args, **kwargs):
        q = MagicMock()
        if model is User:
            def user_filter(*fargs, **fkwargs):
                fq = MagicMock()
                clause = str(getattr(fargs[0] if fargs else None, "left", ""))
                if "email" in clause:
                    fq.first.return_value = state.get("existing_user")
                else:  # id lookup
                    fq.first.return_value = state.get("user")
                return fq
            q.filter.side_effect = user_filter
        elif model is Profile:
            def profile_filter(*fargs, **fkwargs):
                fq = MagicMock()
                fq.first.return_value = state.get("profile")
                return fq
            q.filter.side_effect = profile_filter
        return q

    db.add.side_effect = fake_add
    db.query.side_effect = fake_query
    return db


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


def _override_db(db):
    app.dependency_overrides[get_db] = lambda: db


def test_signup_creates_user_and_profile_and_session(client):
    state = {"existing_user": None, "user": None, "profile": None}
    db = make_db(state)
    _override_db(db)

    response = client.post("/api/auth/signup", json={
        "email": "Laiba@Example.com ",
        "password": "supersecret123",
        "name": " Laiba ",
    })

    assert response.status_code == 201
    body = response.json()
    assert body["user"]["email"] == "laiba@example.com"  # normalized
    assert body["user"]["name"] == "Laiba"
    assert body["profile"]["name"] == "Laiba"

    created_user = next(o for o in state["created"] if isinstance(o, User))
    created_profile = next(o for o in state["created"] if isinstance(o, Profile))
    assert created_profile.user_id == created_user.id
    assert created_user.password_hash != "supersecret123"  # hashed
    assert verify_password("supersecret123", created_user.password_hash)

    # The session cookie now authenticates /me
    state["user"] = created_user
    state["profile"] = created_profile
    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["user"]["email"] == "laiba@example.com"
    assert me.json()["profile"]["id"] == str(created_profile.id)


def test_signup_rejects_duplicate_email(client):
    user = make_user()
    state = {"existing_user": user, "user": user, "profile": None}
    _override_db(make_db(state))

    response = client.post("/api/auth/signup", json={
        "email": "laiba@example.com",
        "password": "anotherpass123",
        "name": "Laiba",
    })

    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_signup_rejects_short_password(client):
    _override_db(make_db({"existing_user": None}))

    response = client.post("/api/auth/signup", json={
        "email": "laiba@example.com",
        "password": "short",
        "name": "Laiba",
    })

    assert response.status_code == 422


def test_login_success_and_logout(client):
    user = make_user()
    profile = Profile(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Laiba",
        created_at=datetime(2026, 9, 1),
        updated_at=datetime(2026, 9, 1),
    )
    state = {"existing_user": user, "user": user, "profile": profile}
    _override_db(make_db(state))

    response = client.post("/api/auth/login", json={
        "email": "laiba@example.com",
        "password": "supersecret123",
    })
    assert response.status_code == 200
    assert response.json()["profile"]["id"] == str(profile.id)

    # Session works
    me = client.get("/api/auth/me")
    assert me.status_code == 200

    # Logout invalidates
    out = client.post("/api/auth/logout")
    assert out.status_code == 200
    me = client.get("/api/auth/me")
    assert me.status_code == 401


def test_login_wrong_password(client):
    user = make_user()
    state = {"existing_user": user, "user": user, "profile": None}
    _override_db(make_db(state))

    response = client.post("/api/auth/login", json={
        "email": "laiba@example.com",
        "password": "definitely-wrong",
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_login_unknown_email_same_error(client):
    state = {"existing_user": None, "user": None, "profile": None}
    _override_db(make_db(state))

    response = client.post("/api/auth/login", json={
        "email": "ghost@example.com",
        "password": "whatever123",
    })
    assert response.status_code == 401
    # identical message — no account enumeration
    assert response.json()["detail"] == "Invalid email or password"


def test_me_anonymous_401(client):
    _override_db(make_db({"existing_user": None}))

    response = client.get("/api/auth/me")
    assert response.status_code == 401
