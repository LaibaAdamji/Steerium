import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    """List view — no extracted text or chunk detail."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    profile_id: uuid.UUID
    filename: str
    document_type: str
    uploaded_at: datetime


class DocumentDetailResponse(BaseModel):
    """Detail view — full extracted text plus ingestion status."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    profile_id: uuid.UUID
    filename: str
    document_type: str
    uploaded_at: datetime
    extracted_text: Optional[str] = None
    chunk_count: int = 0
    embedded: bool = False
