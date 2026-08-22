import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.config import settings
from app.models.enums import DocumentType

try:
    # Requires `CREATE EXTENSION IF NOT EXISTS vector;` on the Postgres
    # instance and the `pgvector` Python package. If pgvector setup becomes
    # a time sink (see hackathon risk notes), the RAG service can fall back
    # to keyword search over `chunk_text` without touching this model —
    # just leave `embedding` null and skip the vector query path.
    from pgvector.sqlalchemy import Vector
    _VECTOR_AVAILABLE = True
except ImportError:  # pgvector package not installed yet
    Vector = None
    _VECTOR_AVAILABLE = False


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"))

    filename: Mapped[str] = mapped_column(String(255))
    document_type: Mapped[DocumentType] = mapped_column(Enum(DocumentType, name="document_type"), default=DocumentType.resume)
    extracted_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    profile: Mapped["Profile"] = relationship(back_populates="documents")
    chunks: Mapped[List["DocumentChunk"]] = relationship(back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"))

    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    chunk_text: Mapped[str] = mapped_column(Text)
    chunk_metadata: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)

    if _VECTOR_AVAILABLE:
        embedding: Mapped[Optional[list]] = mapped_column(Vector(settings.EMBEDDING_DIM), nullable=True)
    else:
        # Fallback column type so the table still creates cleanly if
        # pgvector isn't set up yet. Retrieval falls back to keyword
        # search over chunk_text in this case (see app/services/rag.py).
        embedding: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    document: Mapped["Document"] = relationship(back_populates="chunks")
