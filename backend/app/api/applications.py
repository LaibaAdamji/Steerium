"""Application tracker CRUD — saved opportunity becomes a tracked application."""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Application
from app.models.enums import ApplicationStatus
from app.schemas.application import ApplicationCreate, ApplicationResponse, ApplicationUpdate

router = APIRouter(prefix="/api", tags=["applications"])


@router.get("/applications", response_model=list[ApplicationResponse])
def list_applications(
    profile_id: uuid.UUID | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(Application)
    if profile_id:
        q = q.filter(Application.profile_id == profile_id)
    if status:
        try:
            app_status = ApplicationStatus(status)
            q = q.filter(Application.status == app_status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    return q.order_by(Application.created_at.desc()).all()


@router.post("/applications", response_model=ApplicationResponse, status_code=201)
def create_application(data: ApplicationCreate, db: Session = Depends(get_db)):
    """Track an opportunity as an application."""
    try:
        app_status = ApplicationStatus(data.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")

    application = Application(
        profile_id=data.profile_id,
        opportunity_id=data.opportunity_id,
        status=app_status,
        notes=data.notes,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


@router.patch("/applications/{application_id}", response_model=ApplicationResponse)
def update_application(application_id: uuid.UUID, data: ApplicationUpdate, db: Session = Depends(get_db)):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if data.status is not None:
        try:
            application.status = ApplicationStatus(data.status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")
        # Auto-set applied_at when status moves to 'applied' or beyond
        if data.status in ("applied", "interview", "accepted", "rejected") and not application.applied_at:
            application.applied_at = datetime.utcnow()

    if data.notes is not None:
        application.notes = data.notes

    db.commit()
    db.refresh(application)
    return application
