"""
Auth endpoints: signup, login, logout, me. Session state lives in the
HTTP-only signed cookie managed by SessionMiddleware — the frontend only
ever calls these and reads `/api/auth/me`.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.models import Profile, User
from app.schemas.auth import AuthResponse, LoginRequest, SignupRequest, UserResponse
from app.schemas.profile import ProfileResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        created_at=user.created_at,
    )


def _establish_session(request: Request, user: User) -> None:
    request.session.clear()
    request.session["user_id"] = str(user.id)


@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(data: SignupRequest, request: Request, db: Session = Depends(get_db)):
    """Create account + empty profile, then establish a session."""
    email = data.email.lower().strip()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = User(email=email, password_hash=hash_password(data.password), name=data.name.strip())
    db.add(user)
    db.flush()  # need user.id for the profile

    profile = Profile(
        user_id=user.id,
        name=user.name,
        education={},
        skills=[],
        experience=[],
        interests=[],
    )
    db.add(profile)
    db.commit()
    db.refresh(user)
    db.refresh(profile)

    _establish_session(request, user)
    return AuthResponse(user=_user_response(user), profile=ProfileResponse.model_validate(profile))


@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Verify credentials and establish a session."""
    email = data.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    # Same error for unknown email and wrong password — no account enumeration
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    _establish_session(request, user)

    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    return AuthResponse(
        user=_user_response(user),
        profile=ProfileResponse.model_validate(profile) if profile else None,
    )


@router.post("/logout")
def logout(request: Request):
    """Invalidate the session cookie."""
    request.session.clear()
    return {"message": "Logged out"}


@router.get("/me", response_model=AuthResponse)
def me(request: Request, db: Session = Depends(get_db)):
    """Current session's user + profile. 401 when anonymous."""
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        request.session.clear()
        raise HTTPException(status_code=401, detail="Not authenticated")

    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    return AuthResponse(
        user=_user_response(user),
        profile=ProfileResponse.model_validate(profile) if profile else None,
    )
