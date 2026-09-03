"""
Import every model here so that `Base.metadata.create_all()` (or Alembic's
autogenerate) discovers all tables. Nothing should import app.models.X
directly except this file and Alembic's env.py.
"""
from app.models.profile import Profile  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.goal import Goal  # noqa: F401
from app.models.roadmap_item import RoadmapItem  # noqa: F401
from app.models.opportunity import Opportunity, SavedOpportunity  # noqa: F401
from app.models.application import Application  # noqa: F401
from app.models.document import Document, DocumentChunk  # noqa: F401
