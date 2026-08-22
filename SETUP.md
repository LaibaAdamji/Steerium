# Database setup

## 1. Start Postgres + pgvector

    docker compose up -d

This uses the `pgvector/pgvector:pg16` image and auto-runs
`docker/initdb/01_enable_pgvector.sql` on first boot, which enables the
`vector` extension — no manual extension install needed.

Default credentials (change for anything beyond local dev):
- user: steerium
- password: steerium_dev
- db: steerium
- port: 5432

## 2. Configure the backend

    cd backend
    cp ../.env.example .env
    # DATABASE_URL in .env.example already matches the docker-compose defaults

## 3. Install deps and run migrations

    pip install -r requirements.txt
    alembic upgrade head

This creates all 8 tables (profiles, goals, roadmap_items, opportunities,
saved_opportunities, applications, documents, document_chunks) — verified
against a real Postgres + pgvector instance before this was handed to you.

## 4. Seed demo data

    python -m scripts.seed_db

Populates:
- 17 curated opportunities (data/opportunities.json) across all 5 types
- 1 demo profile ("Ayesha Khan (Demo)")
- 1 demo goal with a 6-milestone / 12-task roadmap

Safe to re-run — it's idempotent and won't duplicate rows.

## 5. Run the API

    uvicorn app.main:app --reload
    curl http://localhost:8000/api/health
    # -> {"status": "ok", "database": "ok"}

## Notes

- If pgvector setup ever becomes a blocker close to demo time, the
  `document_chunks.embedding` column falls back to plain JSON automatically
  (see app/models/document.py) — the RAG service can do keyword search
  over `chunk_text` instead without any model changes.
- To add a new table/column later: edit the model, then
  `alembic revision --autogenerate -m "description"` and
  `alembic upgrade head`.
