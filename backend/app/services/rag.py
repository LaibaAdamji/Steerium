"""
RAG career assistant. Retrieval combines:

1. Semantic search over `document_chunks` embeddings (pgvector cosine
   distance), when the query can be embedded and embedded chunks exist.
2. Keyword fallback (ILIKE over chunk terms) when embeddings are
   unavailable — e.g. uploaded without an API key.

On top of retrieved chunks, the prompt also carries structured context:
profile, active goal, saved opportunities, and application statuses.
The answer distinguishes known context from assumptions and cites the
documents it used (surfaced to the UI via Citation objects).
"""
import logging
import re
import uuid
from dataclasses import dataclass
from typing import List, Optional, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import Application, Document, DocumentChunk, Goal, Opportunity, Profile, SavedOpportunity
from app.services.ai_provider import AIProvider, AIProviderError, get_ai_provider

logger = logging.getLogger(__name__)

TOP_K = 5
SNIPPET_LEN = 240

SYSTEM_PROMPT = (
    "You are Steerium's career assistant. Answer the user's question using the "
    "provided context. Ground every claim in the context and clearly mark "
    "assumptions as assumptions. When you rely on an uploaded document, name "
    "its filename. Be concise and actionable. If the context is insufficient "
    "for a confident answer, say so and give your best general guidance."
)


@dataclass
class RetrievedChunk:
    document_id: uuid.UUID
    filename: str
    chunk_index: int
    chunk_text: str
    score: Optional[float] = None  # cosine similarity; None for keyword hits


def retrieve_chunks(
    db: Session,
    profile_id: uuid.UUID,
    query: str,
    provider: Optional[AIProvider] = None,
) -> Tuple[List[RetrievedChunk], str]:
    """Return (chunks, mode) where mode is 'vector', 'keyword' or 'none'."""
    query_vec = None
    try:
        provider = provider or get_ai_provider()
        query_vec = provider.embed([query])[0]
    except AIProviderError as exc:
        logger.info("Query embedding unavailable — falling back to keyword search: %s", exc)

    base = (
        db.query(DocumentChunk, Document)
        .join(Document, DocumentChunk.document_id == Document.id)
        .filter(Document.profile_id == profile_id)
    )

    if query_vec is not None:
        distance = DocumentChunk.embedding.cosine_distance(query_vec).label("distance")
        rows = (
            base.filter(DocumentChunk.embedding.isnot(None))
            .add_columns(distance)
            .order_by(distance)
            .limit(TOP_K)
            .all()
        )
        if rows:
            return [
                RetrievedChunk(
                    document_id=doc.id,
                    filename=doc.filename,
                    chunk_index=chunk.chunk_index,
                    chunk_text=chunk.chunk_text,
                    score=1.0 - float(dist),
                )
                for chunk, doc, dist in rows
            ], "vector"
        # else: no embedded chunks for this profile → keyword fallback

    terms = _query_terms(query)
    if not terms:
        return [], "none"
    rows = (
        base.filter(or_(*[DocumentChunk.chunk_text.ilike(f"%{t}%") for t in terms]))
        .limit(TOP_K)
        .all()
    )
    if not rows:
        return [], "none"
    return [
        RetrievedChunk(
            document_id=doc.id,
            filename=doc.filename,
            chunk_index=chunk.chunk_index,
            chunk_text=chunk.chunk_text,
        )
        for chunk, doc in rows
    ], "keyword"


def _query_terms(query: str) -> List[str]:
    """Words of 3+ chars, de-duplicated, capped — drives keyword fallback."""
    seen = []
    for word in re.findall(r"[a-zA-Z]{3,}", query.lower()):
        if word not in seen:
            seen.append(word)
        if len(seen) >= 8:
            break
    return seen


def build_context(
    profile: Profile,
    goal: Optional[Goal],
    saved_opportunities: List[Opportunity],
    applications: List[Application],
    chunks: List[RetrievedChunk],
) -> str:
    lines = []

    lines.append("PROFILE:")
    lines.append(f"- Name: {profile.name}")
    lines.append(f"- Education: {profile.education or {}}")
    lines.append(f"- Skills: {', '.join(profile.skills or [])}")
    lines.append(f"- Interests: {', '.join(profile.interests or [])}")
    if profile.career_goals:
        lines.append(f"- Career goals: {profile.career_goals}")
    for exp in profile.experience or []:
        lines.append(f"- Experience: {exp.get('title', '?')} at {exp.get('org', '?')} ({exp.get('dates', '?')})")

    if goal:
        lines.append("")
        lines.append("ACTIVE GOAL:")
        lines.append(f"- {goal.title}" + (f" — {goal.description}" if goal.description else ""))
        if goal.target_date:
            lines.append(f"- Target date: {goal.target_date}")

    if saved_opportunities:
        lines.append("")
        lines.append("SAVED OPPORTUNITIES:")
        for opp in saved_opportunities:
            label = opp.title if not opp.organization else f"{opp.title} ({opp.organization})"
            deadline = f", deadline {opp.deadline}" if opp.deadline else ""
            lines.append(f"- [{opp.type.value}] {label}{deadline}")

    if applications:
        lines.append("")
        lines.append("APPLICATIONS:")
        for app in applications:
            opp = app.opportunity
            label = opp.title if opp else "unknown opportunity"
            lines.append(f"- {label}: {app.status.value}")

    if chunks:
        lines.append("")
        lines.append("RETRIEVED DOCUMENT EXCERPTS:")
        for i, c in enumerate(chunks, start=1):
            score = f", similarity {c.score:.2f}" if c.score is not None else ""
            lines.append(f"[{i}] {c.filename}, chunk {c.chunk_index}{score}:")
            lines.append(c.chunk_text)

    return "\n".join(lines)


def build_prompt(question: str, context: str) -> str:
    return f"""CONTEXT:
{context}

QUESTION: {question}

Answer the question using the context above. Cite document filenames when you
use them. Distinguish known facts (from the context) from assumptions."""


def answer_question(
    db: Session,
    profile: Profile,
    question: str,
    provider: Optional[AIProvider] = None,
) -> dict:
    """
    Full RAG flow for one question. Returns a dict shaped for ChatResponse:
    {"answer": str, "citations": [...], "retrieval_mode": str}.

    Raises AIProviderError if the chat model is unavailable — the endpoint
    maps that to a 502, consistent with roadmap generation.
    """
    provider = provider or get_ai_provider()
    chunks, mode = retrieve_chunks(db, profile.id, question, provider)

    goal = (
        db.query(Goal)
        .filter(Goal.profile_id == profile.id)
        .order_by(Goal.created_at.desc())
        .first()
    )
    saved_opportunities = (
        db.query(Opportunity)
        .join(SavedOpportunity, SavedOpportunity.opportunity_id == Opportunity.id)
        .filter(SavedOpportunity.profile_id == profile.id)
        .limit(10)
        .all()
    )
    applications = db.query(Application).filter(Application.profile_id == profile.id).all()

    context = build_context(profile, goal, saved_opportunities, applications, chunks)
    answer = provider.chat_text(build_prompt(question, context), system=SYSTEM_PROMPT)

    citations = [
        {
            "document_id": c.document_id,
            "filename": c.filename,
            "chunk_index": c.chunk_index,
            "snippet": c.chunk_text[:SNIPPET_LEN],
            "score": c.score,
        }
        for c in chunks
    ]
    return {"answer": answer, "citations": citations, "retrieval_mode": mode}
