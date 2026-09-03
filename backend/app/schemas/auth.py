"""Auth request/response schemas."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.schemas.profile import ProfileResponse


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    name: str
    created_at: datetime


class AuthResponse(BaseModel):
    """Returned by /api/auth/me — user plus their profile (null pre-onboarding)."""
    user: UserResponse
    profile: Optional[ProfileResponse] = None
