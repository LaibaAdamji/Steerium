"""
Profile CRUD — scoped to the authenticated user's single profile.
GET /api/profile and PUT /api/profile operate on the session's profile;
the ID-based lookup stays for reading a specific profile's public face.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_profile
from app.models import Profile
from app.schemas.profile import ProfileCreate, ProfileUpdate, ProfileResponse

router = APIRouter(prefix="/api", tags=["profile"])


@router.get("/profile", response_model=ProfileResponse)
def get_profile(profile: Profile = Depends(get_current_profile)):
    """Return the authenticated user's profile."""
    return profile


@router.put("/profile", response_model=ProfileResponse)
def upsert_profile(
    data: ProfileUpdate,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Update the authenticated user's profile (created lazily if missing)."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


# --- Optional ID-based read (useful for deep links) ---

@router.get("/profile/{profile_id}", response_model=ProfileResponse)
def get_profile_by_id(
    profile_id: str,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    try:
        pid = uuid.UUID(profile_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid profile id")
    if pid != profile.id:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile
