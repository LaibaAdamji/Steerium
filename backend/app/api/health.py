from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter()


@router.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001 — deliberately broad for a status probe
        db_status = f"error: {exc}"

    return {
        "status": "ok",
        "database": db_status,
    }
