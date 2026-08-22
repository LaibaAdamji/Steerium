"""
SQLAlchemy engine + session management.

Uses the sync psycopg driver for simplicity during the hackathon (no need
for async here — FastAPI runs sync DB calls in a threadpool fine at this
scale). Swap to an async engine later only if it becomes a real bottleneck.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, future=True)

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
