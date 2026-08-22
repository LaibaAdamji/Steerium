import uuid
from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import Priority, RoadmapItemStatus, RoadmapItemType


class RoadmapItem(Base):
    """
    Collapses the spec's separate `milestones` and `tasks` tables into one,
    distinguished by `type`. Tasks set `parent_id` to their milestone's id;
    milestones leave it null. This trades a small amount of query care
    (filter by type) for one fewer table and one fewer model to keep in
    sync — worth it under hackathon time pressure. Progress bars for
    "milestones done" vs "tasks done" are still just two filtered counts
    against this single table.
    """
    __tablename__ = "roadmap_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goal_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("goals.id", ondelete="CASCADE"))
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("roadmap_items.id", ondelete="CASCADE"), nullable=True
    )

    type: Mapped[RoadmapItemType] = mapped_column(Enum(RoadmapItemType, name="roadmap_item_type"))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # short "why this task" from the AI

    order: Mapped[int] = mapped_column(Integer, default=0)
    priority: Mapped[Priority] = mapped_column(Enum(Priority, name="roadmap_priority"), default=Priority.medium)
    status: Mapped[RoadmapItemStatus] = mapped_column(
        Enum(RoadmapItemStatus, name="roadmap_item_status"), default=RoadmapItemStatus.not_started
    )
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    goal: Mapped["Goal"] = relationship(back_populates="roadmap_items")
    parent: Mapped[Optional["RoadmapItem"]] = relationship(remote_side=[id], back_populates="children")
    children: Mapped[List["RoadmapItem"]] = relationship(back_populates="parent", cascade="all, delete-orphan")
