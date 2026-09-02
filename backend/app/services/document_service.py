"""
Document ingestion: extract text (PyMuPDF for PDFs, UTF-8 for text
files), chunk it, embed the chunks, and persist everything.

Embedding failures are deliberately non-fatal — the document and its
chunks still land in the DB with null embeddings, and RAG retrieval
falls back to keyword search (see rag.py). That keeps the upload demo
working even without a configured API key.
"""
import logging
from typing import List, Optional

import fitz  # PyMuPDF
from sqlalchemy.orm import Session

from app.models import Document, DocumentChunk, Profile
from app.models.enums import DocumentType
from app.services.ai_provider import AIProvider, AIProviderError, get_ai_provider

logger = logging.getLogger(__name__)

CHUNK_SIZE = 600       # characters — sized for resume sections
CHUNK_OVERLAP = 100
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

SUPPORTED_EXTENSIONS = (".pdf", ".txt", ".md")


class DocumentProcessingError(ValueError):
    """Invalid or unextractable upload."""


def extract_text(filename: str, content: bytes) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        try:
            with fitz.open(stream=content, filetype="pdf") as doc:
                text = "\n".join(page.get_text() for page in doc)
        except Exception as exc:
            raise DocumentProcessingError(f"Could not read PDF: {exc}") from exc
    elif name.endswith((".txt", ".md")):
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise DocumentProcessingError("Text file is not valid UTF-8") from exc
    else:
        raise DocumentProcessingError(
            f"Unsupported file type. Supported: {', '.join(SUPPORTED_EXTENSIONS)}"
        )

    text = text.strip()
    if not text:
        raise DocumentProcessingError("No extractable text found in the file")
    return text


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """
    Split on paragraph boundaries first, hard-wrap oversized paragraphs
    (with overlap so wrapped lines aren't severed mid-fact), then pack
    pieces into chunks up to chunk_size. Keeps resume sections coherent.
    """
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    pieces: List[str] = []
    for para in paragraphs:
        while len(para) > chunk_size:
            pieces.append(para[:chunk_size])
            para = para[chunk_size - overlap:]
        if para:
            pieces.append(para)

    chunks: List[str] = []
    current = ""
    for piece in pieces:
        if current and len(current) + len(piece) + 1 > chunk_size:
            chunks.append(current)
            current = piece
        else:
            current = f"{current}\n{piece}" if current else piece
    if current:
        chunks.append(current)
    return chunks


def ingest_document(
    db: Session,
    profile: Profile,
    filename: str,
    document_type: DocumentType,
    content: bytes,
    provider: Optional[AIProvider] = None,
) -> Document:
    """Extract, chunk, embed, and persist a document. Returns the Document."""
    if len(content) > MAX_UPLOAD_BYTES:
        raise DocumentProcessingError("File exceeds the 10 MB limit")
    if len(content) == 0:
        raise DocumentProcessingError("Uploaded file is empty")

    text = extract_text(filename, content)
    chunks = chunk_text(text)

    document = Document(
        profile_id=profile.id,
        filename=filename,
        document_type=document_type,
        extracted_text=text,
    )
    db.add(document)
    db.flush()  # need document.id for chunks

    # Embeddings are best-effort: on failure we still store the chunks
    # (embedding = null) so keyword retrieval can find them later.
    try:
        provider = provider or get_ai_provider()
        vectors = provider.embed(chunks)
        if len(vectors) != len(chunks):
            raise AIProviderError(f"Embedding count mismatch: {len(vectors)} != {len(chunks)}")
    except AIProviderError as exc:
        vectors = None
        logger.warning("Embedding failed for '%s' — chunks stored without vectors: %s", filename, exc)

    for i, chunk in enumerate(chunks):
        db.add(DocumentChunk(
            document_id=document.id,
            chunk_index=i,
            chunk_text=chunk,
            chunk_metadata={"document_type": document_type.value, "filename": filename},
            embedding=vectors[i] if vectors else None,
        ))

    db.commit()
    db.refresh(document)
    return document
