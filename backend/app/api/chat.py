"""
RAG career assistant endpoint. Retrieves the authenticated user's
profile/document/opportunity context and answers with Qwen — see
app/services/rag.py.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_profile
from app.models import Profile
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ai_provider import AIProviderError
from app.services.rag import answer_question

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Ask the grounded career assistant a question."""
    try:
        result = answer_question(db, profile, request.question)
    except AIProviderError as exc:
        raise HTTPException(status_code=502, detail=f"Chat failed: {exc}")

    return ChatResponse(**result)
