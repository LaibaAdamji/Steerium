"""
Vercel serverless entrypoint.

Vercel's Python runtime loads the ASGI application from this file. All real
logic lives in backend/app — this file only makes that package importable
and re-exports its FastAPI `app`. Do not add routes or business logic here.

The backend's modules import each other as `app.*` (matching
`uvicorn app.main:app` run from backend/), so backend/ is put on sys.path.
"""
import sys
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from app.main import app  # noqa: E402
