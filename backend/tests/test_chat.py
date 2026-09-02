"""
RAG chat tests. The AI provider is faked and the DB session is mocked —
both retrieval modes (vector and keyword fallback) are exercised by
configuring the corresponding mock query chains.
"""
import uuid
from datetime import date, datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app
from app.models import Application, Document, DocumentChunk, Goal, Opportunity, Profile
from app.models.enums import ApplicationStatus, GoalStatus, OpportunityType
from app.services import rag
from app.services.ai_provider import AIProviderError
from app.services.rag import answer_question, retrieve_chunks

client = TestClient(app)


class FakeProvider:
    def __init__(self, chat_answer="Canned answer.", embed_error=None, chat_error=None):
        self.chat_answer = chat_answer
        self.embed_error = embed_error
        self.chat_error = chat_error
        self.chat_prompts: list[str] = []

    def chat_text(self, prompt, system=""):
        if self.chat_error:
            raise self.chat_error
        self.chat_prompts.append(prompt)
        return self.chat_answer

    def chat_json(self, prompt, system=""):
        return {}

    def embed(self, texts):
        if self.embed_error:
            raise self.embed_error
        return [[0.1, 0.2, 0.3, 0.4] for _ in texts]


def make_profile() -> Profile:
    return Profile(
        id=uuid.uuid4(),
        name="Ayesha Khan (Demo)",
        education={"degree": "BS CS", "institution": "FAST-NUCES"},
        skills=["Python", "React"],
        experience=[],
        interests=["AI"],
        career_goals="Funded MS abroad",
    )


def make_chunk_and_doc():
    doc = Document(
        id=uuid.uuid4(),
        profile_id=uuid.uuid4(),
        filename="resume.pdf",
        document_type="resume",
        extracted_text="Ayesha Khan — Python, React",
        uploaded_at=datetime(2026, 9, 2),
    )
    chunk = DocumentChunk(
        id=uuid.uuid4(),
        document_id=doc.id,
        chunk_index=0,
        chunk_text="Ayesha Khan — BS Computer Science at FAST-NUCES. Skills: Python, React, SQL.",
    )
    return chunk, doc


def make_rag_db(chunk, doc, vector_rows=None, keyword_rows=None,
                goal=None, opportunities=None, applications=None):
    """Mock session wired so each rag.py query chain returns the given rows."""
    db = MagicMock()

    chunk_q = MagicMock()
    base_chain = chunk_q.join.return_value.filter.return_value.filter.return_value
    keyword_chain = base_chain.limit.return_value
    keyword_chain.all.return_value = keyword_rows or []
    vector_chain = (
        base_chain.add_columns.return_value.order_by.return_value.limit.return_value
    )
    vector_chain.all.return_value = vector_rows or []

    goal_q = MagicMock()
    goal_q.filter.return_value.order_by.return_value.first.return_value = goal

    opp_q = MagicMock()
    opp_q.join.return_value.filter.return_value.limit.return_value.all.return_value = opportunities or []

    app_q = MagicMock()
    app_q.filter.return_value.all.return_value = applications or []

    profile_q = MagicMock()

    def fake_query(model, *args, **kwargs):
        if model is DocumentChunk:
            return chunk_q
        if model is Goal:
            return goal_q
        if model is Opportunity:
            return opp_q
        if model is Application:
            return app_q
        if model is Profile:
            return profile_q
        return MagicMock()

    db.query.side_effect = fake_query
    return db, profile_q


# --- retrieve_chunks ---

def test_retrieve_chunks_vector_mode():
    profile = make_profile()
    chunk, doc = make_chunk_and_doc()
    db, _ = make_rag_db(chunk, doc, vector_rows=[(chunk, doc, 0.25)])

    chunks, mode = retrieve_chunks(db, profile.id, "what are my skills?", FakeProvider())

    assert mode == "vector"
    assert len(chunks) == 1
    assert chunks[0].filename == "resume.pdf"
    assert chunks[0].score == pytest.approx(0.75)


def test_retrieve_chunks_keyword_fallback_when_embedding_fails():
    profile = make_profile()
    chunk, doc = make_chunk_and_doc()
    db, _ = make_rag_db(chunk, doc, keyword_rows=[(chunk, doc)])

    provider = FakeProvider(embed_error=AIProviderError("no api key"))
    chunks, mode = retrieve_chunks(db, profile.id, "what are my skills?", provider)

    assert mode == "keyword"
    assert len(chunks) == 1
    assert chunks[0].score is None
    assert "Python" in chunks[0].chunk_text


def test_retrieve_chunks_keyword_fallback_when_no_embeddings():
    """Vector search returns nothing → falls through to keyword rows."""
    profile = make_profile()
    chunk, doc = make_chunk_and_doc()
    db, _ = make_rag_db(chunk, doc, vector_rows=[], keyword_rows=[(chunk, doc)])

    chunks, mode = retrieve_chunks(db, profile.id, "what are my skills?", FakeProvider())

    assert mode == "keyword"
    assert len(chunks) == 1


def test_retrieve_chunks_nothing_available():
    profile = make_profile()
    db, _ = make_rag_db(None, None)
    chunks, mode = retrieve_chunks(db, profile.id, "anything", FakeProvider())
    assert chunks == []
    assert mode == "none"


# --- answer_question ---

def test_answer_question_returns_citations_and_uses_context():
    profile = make_profile()
    chunk, doc = make_chunk_and_doc()
    goal = Goal(
        id=uuid.uuid4(), profile_id=profile.id,
        title="MS in Computer Science — Fall 2028",
        description="Funded MS abroad", target_date=date(2028, 8, 1),
        status=GoalStatus.active,
    )
    opp = Opportunity(
        id=uuid.uuid4(), type=OpportunityType.scholarship,
        title="Fulbright Scholarship", organization="Fulbright",
        deadline=date(2027, 5, 1),
    )
    application = Application(
        id=uuid.uuid4(), profile_id=profile.id, opportunity_id=uuid.uuid4(),
        status=ApplicationStatus.preparing, opportunity=opp,
    )
    db, _ = make_rag_db(chunk, doc, keyword_rows=[(chunk, doc)],
                        goal=goal, opportunities=[opp], applications=[application])

    provider = FakeProvider(chat_answer="You should strengthen your research profile.")
    result = answer_question(db, profile, "Am I competitive for a scholarship?", provider)

    assert result["answer"] == "You should strengthen your research profile."
    assert result["retrieval_mode"] == "keyword"
    assert len(result["citations"]) == 1
    citation = result["citations"][0]
    assert citation["document_id"] == doc.id
    assert citation["filename"] == "resume.pdf"
    assert citation["chunk_index"] == 0
    assert "Python" in citation["snippet"]

    # the prompt carried the structured context too
    prompt = provider.chat_prompts[0]
    assert "Ayesha Khan" in prompt
    assert "MS in Computer Science" in prompt
    assert "Fulbright" in prompt
    assert "resume.pdf" in prompt
    assert "Am I competitive" in prompt


# --- endpoint wiring ---

def _override_db(db):
    app.dependency_overrides[get_db] = lambda: db


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


def test_chat_endpoint_happy_path():
    profile = make_profile()
    chunk, doc = make_chunk_and_doc()
    db, profile_q = make_rag_db(chunk, doc, keyword_rows=[(chunk, doc)])
    profile_q.first.return_value = profile
    _override_db(db)

    provider = FakeProvider(chat_answer="Grounded answer.")
    with patch.object(rag, "get_ai_provider", return_value=provider):
        response = client.post("/api/chat", json={"question": "What should I improve before applying?"})

    assert response.status_code == 200
    body = response.json()
    assert body["answer"] == "Grounded answer."
    assert body["retrieval_mode"] == "keyword"
    assert body["citations"][0]["filename"] == "resume.pdf"


def test_chat_endpoint_502_on_provider_failure():
    profile = make_profile()
    db, profile_q = make_rag_db(None, None)
    profile_q.first.return_value = profile
    _override_db(db)

    provider = FakeProvider(chat_error=AIProviderError("model down"))
    with patch.object(rag, "get_ai_provider", return_value=provider):
        response = client.post("/api/chat", json={"question": "What should I do next?"})

    assert response.status_code == 502
    assert "Chat failed" in response.json()["detail"]


def test_chat_endpoint_404_without_profile():
    db, profile_q = make_rag_db(None, None)
    profile_q.first.return_value = None
    _override_db(db)

    response = client.post("/api/chat", json={"question": "What should I do next?"})
    assert response.status_code == 404


def test_chat_endpoint_validates_question_length():
    response = client.post("/api/chat", json={"question": "hi"})
    assert response.status_code == 422
