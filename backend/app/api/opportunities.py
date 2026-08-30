"""Opportunity listing, filtering, and saving."""
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Opportunity, SavedOpportunity
from app.models.enums import OpportunityType
from app.schemas.opportunity import OpportunityResponse

router = APIRouter(prefix="/api", tags=["opportunities"])


@router.get("/opportunities", response_model=list[OpportunityResponse])
def list_opportunities(
    type: Optional[str] = Query(None, description="Filter by opportunity type"),
    search: Optional[str] = Query(None, description="Search title, organization, or description"),
    tag: Optional[str] = Query(None, description="Filter by tag (exact match within JSON array)"),
    deadline_after: Optional[date] = Query(None, description="Only opportunities with deadline on or after this date"),
    deadline_before: Optional[date] = Query(None, description="Only opportunities with deadline on or before this date"),
    db: Session = Depends(get_db),
):
    q = db.query(Opportunity)

    if type:
        try:
            opp_type = OpportunityType(type)
            q = q.filter(Opportunity.type == opp_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid type: {type}. Valid: {[e.value for e in OpportunityType]}")

    if search:
        pattern = f"%{search}%"
        q = q.filter(
            or_(
                Opportunity.title.ilike(pattern),
                Opportunity.organization.ilike(pattern),
                Opportunity.description.ilike(pattern),
            )
        )

    if tag:
        # JSON array containment check (Postgres JSONB @> operator)
        q = q.filter(Opportunity.tags.contains([tag]))

    if deadline_after:
        q = q.filter(Opportunity.deadline >= deadline_after)
    if deadline_before:
        q = q.filter(Opportunity.deadline <= deadline_before)

    return q.order_by(Opportunity.deadline.asc().nullslast()).all()


@router.post("/opportunities/{opportunity_id}/save", status_code=201)
def save_opportunity(opportunity_id: uuid.UUID, profile_id: uuid.UUID = Query(...), db: Session = Depends(get_db)):
    """Bookmark an opportunity for a profile."""
    opp = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    existing = (
        db.query(SavedOpportunity)
        .filter(SavedOpportunity.profile_id == profile_id, SavedOpportunity.opportunity_id == opportunity_id)
        .first()
    )
    if existing:
        return {"message": "Already saved", "profile_id": str(profile_id), "opportunity_id": str(opportunity_id)}

    db.add(SavedOpportunity(profile_id=profile_id, opportunity_id=opportunity_id))
    db.commit()
    return {"message": "Saved", "profile_id": str(profile_id), "opportunity_id": str(opportunity_id)}


@router.delete("/opportunities/{opportunity_id}/save", status_code=200)
def unsave_opportunity(opportunity_id: uuid.UUID, profile_id: uuid.UUID = Query(...), db: Session = Depends(get_db)):
    """Remove a bookmark."""
    saved = (
        db.query(SavedOpportunity)
        .filter(SavedOpportunity.profile_id == profile_id, SavedOpportunity.opportunity_id == opportunity_id)
        .first()
    )
    if not saved:
        raise HTTPException(status_code=404, detail="Not saved")
    db.delete(saved)
    db.commit()
    return {"message": "Unsaved"}


@router.get("/opportunities/saved", response_model=list[uuid.UUID])
def list_saved_opportunity_ids(profile_id: uuid.UUID = Query(...), db: Session = Depends(get_db)):
    """Return just the opportunity IDs a profile has saved — lightweight for UI badge rendering."""
    rows = (
        db.query(SavedOpportunity.opportunity_id)
        .filter(SavedOpportunity.profile_id == profile_id)
        .all()
    )
    return [r[0] for r in rows]
