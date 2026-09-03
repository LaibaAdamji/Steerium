"""
SQLAlchemy engine + session management.

Uses the sync psycopg driver for simplicity during the hackathon (no need
for async here — FastAPI runs sync DB calls in a threadpool fine at this
scale). Swap to an async engine later only if it becomes a real bottleneck.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

# Supabase-style poolers (PgBouncer in transaction mode) break psycopg's
# automatic prepared statements. Disable them when the URL asks for it —
# direct connections (e.g. a local Postgres install) keep the default.
_kwargs = {"pool_pre_ping": True, "future": True}
if "pooler.supabase.com" in settings.DATABASE_URL:
    _kwargs["connect_args"] = {"prepare_threshold": None}

engine = create_engine(settings.DATABASE_URL, **_kwargs)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


def get_db() -> Session:
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
