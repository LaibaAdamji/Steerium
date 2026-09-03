import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Profile(Base):
    """
    Career data for exactly one authenticated user (1:1 via user_id).
    Every other table hangs off profile_id.
    """
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255))

    # Free-form structured fields. JSON keeps this flexible without extra
    # join tables — fine for a hackathon MVP; normalize later if needed.
    education: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)          # e.g. {"degree": ..., "institution": ..., "year": ...}
    skills: Mapped[Optional[List[str]]] = mapped_column(JSON, default=list)
    experience: Mapped[Optional[List[dict]]] = mapped_column(JSON, default=list)   # list of {title, org, description, dates}
    interests: Mapped[Optional[List[str]]] = mapped_column(JSON, default=list)
    career_goals: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    goals: Mapped[List["Goal"]] = relationship(back_populates="profile", cascade="all, delete-orphan")
    documents: Mapped[List["Document"]] = relationship(back_populates="profile", cascade="all, delete-orphan")
    applications: Mapped[List["Application"]] = relationship(back_populates="profile", cascade="all, delete-orphan")
    saved_opportunities: Mapped[List["SavedOpportunity"]] = relationship(back_populates="profile", cascade="all, delete-orphan")
    user: Mapped[Optional["User"]] = relationship(back_populates="profile")
