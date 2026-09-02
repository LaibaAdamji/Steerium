"""
Document ingestion tests. The AI provider is faked and the DB session is
mocked — no live Model Studio or Postgres needed. PDF extraction is
exercised against a tiny in-memory PDF generated with PyMuPDF itself.
"""
import uuid
from datetime import datetime
from unittest.mock import MagicMock, patch

import fitz
import pytest
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app
from app.models import Document, DocumentChunk, Profile
from app.models.enums import DocumentType
from app.services import document_service
from app.services.ai_provider import AIProviderError
from app.services.document_service import (
    DocumentProcessingError,
    chunk_text,
    extract_text,
    ingest_document,
)

client = TestClient(app)


def make_profile() -> Profile:
    return Profile(
        id=uuid.uuid4(),
        name="Ayesha Khan (Demo)",
        education={"degree": "BS CS", "institution": "FAST-NUCES"},
        skills=["Python"],
        experience=[],
        interests=["AI"],
        career_goals="Funded MS abroad",
    )


def make_pdf_bytes(lines: list[str]) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    for i, line in enumerate(lines):
        page.insert_text((72, 72 + 18 * i), line)
    pdf = doc.tobytes()
    doc.close()
    return pdf


class FakeProvider:
    def __init__(self, embed_error: AIProviderError | None = None):
        self.embed_error = embed_error
        self.embedded_texts: list[list[str]] = []

    def chat_text(self, prompt, system=""):
        return "text"

    def chat_json(self, prompt, system=""):
        return {}

    def embed(self, texts):
        if self.embed_error:
            raise self.embed_error
        self.embedded_texts.append(list(texts))
        return [[0.1, 0.2, 0.3, 0.4] for _ in texts]


# --- extraction ---

def test_extract_text_from_pdf():
    pdf = make_pdf_bytes(["Ayesha Khan", "BS Computer Science, FAST-NUCES"])
    text = extract_text("resume.pdf", pdf)
    assert "Ayesha Khan" in text
    assert "FAST-NUCES" in text


def test_extract_text_from_txt():
    text = extract_text("notes.txt", "skills: python, react".encode("utf-8"))
    assert text == "skills: python, react"


def test_extract_text_rejects_unsupported_extension():
    with pytest.raises(DocumentProcessingError):
        extract_text("resume.docx", b"PK\x03\x04")


def test_extract_text_rejects_blank_pdf():
    with pytest.raises(DocumentProcessingError):
        extract_text("empty.pdf", make_pdf_bytes(["", "  "]))


# --- chunking ---

def test_chunk_text_packs_paragraphs():
    paragraphs = [f"Paragraph {i} " + "x" * 80 for i in range(10)]
    text = "\n\n".join(paragraphs)
    chunks = chunk_text(text)
    assert len(chunks) > 1
    assert all(len(c) <= 600 for c in chunks)
    # nothing lost — every paragraph's content survives
    for para in paragraphs:
        assert any(" ".join(para.split())[:60] in " ".join(c.split()) for c in chunks)


def test_chunk_text_short_text_is_single_chunk():
    assert chunk_text("one short paragraph") == ["one short paragraph"]


# --- ingestion (service, mocked session) ---

def test_ingest_document_embeds_and_persists_chunks():
    profile = make_profile()
    provider = FakeProvider()
    db = MagicMock()
    added = []

    def fake_add(obj):
        obj.id = obj.id or uuid.uuid4()
        added.append(obj)

    db.add.side_effect = fake_add

    doc = ingest_document(
        db, profile, "resume.pdf",
        DocumentType.resume,
        make_pdf_bytes(["Ayesha Khan", "BS Computer Science, FAST-NUCES"]),
        provider=provider,
    )

    documents = [o for o in added if isinstance(o, Document)]
    chunks = [o for o in added if isinstance(o, DocumentChunk)]
    assert len(documents) == 1
    assert chunks and all(c.embedding == [0.1, 0.2, 0.3, 0.4] for c in chunks)
    assert [c.chunk_index for c in chunks] == list(range(len(chunks)))
    assert provider.embedded_texts[0] == [c.chunk_text for c in chunks]
    assert doc.extracted_text and "Ayesha Khan" in doc.extracted_text
    db.commit.assert_called_once()


def test_ingest_document_survives_embedding_failure():
    profile = make_profile()
    provider = FakeProvider(embed_error=AIProviderError("no api key"))
    db = MagicMock()
    added = []

    def fake_add(obj):
        obj.id = obj.id or uuid.uuid4()
        added.append(obj)

    db.add.side_effect = fake_add

    doc = ingest_document(
        db, profile, "resume.txt", DocumentType.resume,
        b"plain text resume",
        provider=provider,
    )

    chunks = [o for o in added if isinstance(o, DocumentChunk)]
    assert chunks and all(c.embedding is None for c in chunks)
    db.commit.assert_called_once()  # still persisted


# --- endpoint wiring ---

def _override_db(db):
    app.dependency_overrides[get_db] = lambda: db


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


def test_upload_endpoint_txt_happy_path():
    profile = make_profile()
    db = MagicMock()
    chunks_seen: list[DocumentChunk] = []

    def fake_query(model, *args, **kwargs):
        q = MagicMock()
        if model is Profile:
            q.filter.return_value.first.return_value = profile
            q.first.return_value = profile
        elif model is DocumentChunk:
            q.filter.return_value.all.return_value = chunks_seen
        return q

    def fake_add(obj):
        obj.id = obj.id or uuid.uuid4()
        if isinstance(obj, Document):
            obj.uploaded_at = datetime(2026, 9, 2)
        elif isinstance(obj, DocumentChunk):
            obj.embedding = [0.1, 0.2, 0.3, 0.4]
            chunks_seen.append(obj)

    db.query.side_effect = fake_query
    db.add.side_effect = fake_add
    _override_db(db)

    provider = FakeProvider()
    with patch.object(document_service, "get_ai_provider", return_value=provider):
        response = client.post(
            "/api/documents",
            files={"file": ("resume.txt", b"skills: python, react", "text/plain")},
            data={"document_type": "resume"},
        )

    assert response.status_code == 201
    body = response.json()
    assert body["filename"] == "resume.txt"
    assert body["document_type"] == "resume"
    assert body["chunk_count"] == len(chunks_seen)
    assert body["embedded"] is True
    assert "python" in body["extracted_text"]


def test_upload_endpoint_rejects_unsupported_type():
    profile = make_profile()
    db = MagicMock()

    def fake_query(model, *args, **kwargs):
        q = MagicMock()
        if model is Profile:
            q.first.return_value = profile
        return q

    db.query.side_effect = fake_query
    _override_db(db)

    response = client.post(
        "/api/documents",
        files={"file": ("resume.docx", b"PK\x03\x04", "application/octet-stream")},
    )
    assert response.status_code == 422
    assert "Unsupported file type" in response.json()["detail"]


def test_upload_endpoint_404_without_profile():
    db = MagicMock()

    def fake_query(model, *args, **kwargs):
        q = MagicMock()
        q.first.return_value = None
        return q

    db.query.side_effect = fake_query
    _override_db(db)

    response = client.post(
        "/api/documents",
        files={"file": ("resume.txt", b"skills", "text/plain")},
    )
    assert response.status_code == 404
