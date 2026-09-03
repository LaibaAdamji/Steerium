"""
Document upload and management. PDFs are text-extracted with PyMuPDF,
chunked, and embedded at upload time (best-effort — see
document_service.ingest_document). All documents belong to the
authenticated user's profile.
"""
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_profile
from app.models import Document, DocumentChunk, Profile
from app.models.enums import DocumentType
from app.schemas.document import DocumentDetailResponse, DocumentResponse
from app.services.document_service import DocumentProcessingError, ingest_document

router = APIRouter(prefix="/api", tags=["documents"])


def _build_detail(doc: Document, db: Session) -> DocumentDetailResponse:
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).all()
    return DocumentDetailResponse(
        id=doc.id,
        profile_id=doc.profile_id,
        filename=doc.filename,
        document_type=doc.document_type.value,
        uploaded_at=doc.uploaded_at,
        extracted_text=doc.extracted_text,
        chunk_count=len(chunks),
        embedded=any(c.embedding is not None for c in chunks),
    )


@router.post("/documents", response_model=DocumentDetailResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    document_type: DocumentType = Form(DocumentType.other),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Upload a resume/transcript (.pdf, .txt, .md). Extracts text and embeds chunks."""
    content = await file.read()
    try:
        document = ingest_document(db, profile, file.filename or "upload", document_type, content)
    except DocumentProcessingError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return _build_detail(document, db)


@router.get("/documents", response_model=list[DocumentResponse])
def list_documents(
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    return (
        db.query(Document)
        .filter(Document.profile_id == profile.id)
        .order_by(Document.uploaded_at.desc())
        .all()
    )


@router.get("/documents/{document_id}", response_model=DocumentDetailResponse)
def get_document(
    document_id: uuid.UUID,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or doc.profile_id != profile.id:
        raise HTTPException(status_code=404, detail="Document not found")
    return _build_detail(doc, db)


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(
    document_id: uuid.UUID,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or doc.profile_id != profile.id:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)  # chunks cascade via relationship
    db.commit()
    return None
