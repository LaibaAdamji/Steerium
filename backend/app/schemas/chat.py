import uuid
from typing import List, Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)


class Citation(BaseModel):
    """A retrieved chunk the answer was grounded in — surfaced for the UI."""
    document_id: uuid.UUID
    filename: str
    chunk_index: int
    snippet: str
    score: Optional[float] = None  # cosine similarity for vector mode, null for keyword


class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation] = []
    retrieval_mode: str  # "vector" | "keyword" | "none"
