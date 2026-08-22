import uuid
from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import Date, DateTime, Enum, ForeignKey, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import OpportunityType


class Opportunity(Base):
    """
    Curated/seeded — NOT scraped. Populated from data/opportunities.json
    at seed time for the hackathon MVP.
    """
    __tablename__ = "opportunities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type: Mapped[OpportunityType] = mapped_column(Enum(OpportunityType, name="opportunity_type"))
    title: Mapped[str] = mapped_column(String(255))
    organization: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)  # blank/demo-labeled if no real URL
    requirements: Mapped[Optional[List[str]]] = mapped_column(JSON, default=list)
    tags: Mapped[Optional[List[str]]] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    saved_by: Mapped[List["SavedOpportunity"]] = relationship(back_populates="opportunity", cascade="all, delete-orphan")
    applications: Mapped[List["Application"]] = relationship(back_populates="opportunity")


class SavedOpportunity(Base):
    """Join table: a profile bookmarking an opportunity (not yet an application)."""
    __tablename__ = "saved_opportunities"

    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True)
    opportunity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("opportunities.id", ondelete="CASCADE"), primary_key=True)
    saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    profile: Mapped["Profile"] = relationship(back_populates="saved_opportunities")
    opportunity: Mapped["Opportunity"] = relationship(back_populates="saved_by")
