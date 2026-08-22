import uuid
from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import GoalStatus


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"))

    title: Mapped[str] = mapped_column(String(255))            # e.g. "MS in Computer Science — Fall 2028"
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    target_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[GoalStatus] = mapped_column(Enum(GoalStatus, name="goal_status"), default=GoalStatus.active)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    profile: Mapped["Profile"] = relationship(back_populates="goals")
    roadmap_items: Mapped[List["RoadmapItem"]] = relationship(
        back_populates="goal", cascade="all, delete-orphan", order_by="RoadmapItem.order"
    )
