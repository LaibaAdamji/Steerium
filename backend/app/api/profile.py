"""
Profile CRUD. For the hackathon MVP there's no auth — the seeded demo
profile is the single "user". GET without an id returns whichever profile
exists first (the demo profile after seeding).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Profile
from app.schemas.profile import ProfileCreate, ProfileUpdate, ProfileResponse

router = APIRouter(prefix="/api", tags=["profile"])


@router.get("/profile", response_model=ProfileResponse)
def get_profile(db: Session = Depends(get_db)):
    """Return the first (demo) profile — convenience endpoint for single-tenant MVP."""
    profile = db.query(Profile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="No profile found. POST /api/profile to create one.")
    return profile


@router.post("/profile", response_model=ProfileResponse, status_code=201)
def create_profile(data: ProfileCreate, db: Session = Depends(get_db)):
    """Create a profile. Idempotent for the demo — returns existing if one is present."""
    existing = db.query(Profile).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Profile already exists (id={existing.id}). Use PUT /api/profile to update.",
        )
    profile = Profile(**data.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.put("/profile", response_model=ProfileResponse)
def upsert_profile(data: ProfileCreate, db: Session = Depends(get_db)):
    """Idempotent upsert: update the existing profile or create one if none exists."""
    profile = db.query(Profile).first()
    if profile:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(profile, field, value)
        db.commit()
        db.refresh(profile)
    else:
        profile = Profile(**data.model_dump())
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


# --- Optional ID-based endpoints (useful if you later add multi-profile) ---

@router.get("/profile/{profile_id}", response_model=ProfileResponse)
def get_profile_by_id(profile_id: str, db: Session = Depends(get_db)):
    import uuid
    profile = db.query(Profile).filter(Profile.id == uuid.UUID(profile_id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile
