"""
Auth dependencies shared by every protected router.

Session lives in an HTTP-only signed cookie (Starlette SessionMiddleware).
`get_current_user` resolves the user id from the session; `get_current_profile`
resolves the user's single profile. NEVER query Profile.first() for
authenticated requests — data must be scoped to the session's user.
"""
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Profile, User


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # Stale session (user deleted) — treat as logged out
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def get_current_profile(request: Request, db: Session = Depends(get_db)) -> Profile:
    """
    Resolve the authenticated user's profile. Users have exactly one profile;
    if it's missing (created before onboarding completed), create it lazily
    from the account name so authenticated endpoints have something to hang
    data on.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if profile:
        return profile

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    profile = Profile(user_id=user.id, name=user.name, education={}, skills=[], experience=[], interests=[])
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile
