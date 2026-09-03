# Steerium

> **The operating system for your career.**

Steerium is an AI-powered career workspace that turns a user's career goal into an actionable workflow:

**Goal → Roadmap → Opportunities → Applications → Progress**

Instead of being another generic career chatbot, Steerium keeps the user's career context—profile, resume, skills, goals, documents, saved opportunities, applications, and tasks—in one persistent workspace and uses AI to make recommendations grounded in that context.

## Hackathon MVP

For the hackathon, we are intentionally building **one complete vertical workflow** rather than a large collection of disconnected features.

### Core demo flow

1. User creates a career profile and/or uploads a resume.
2. User creates a goal, e.g. `MS in Computer Science — Fall 2028`.
3. Steerium generates a practical roadmap with milestones and tasks.
4. User discovers a small curated set of opportunities.
5. User saves an opportunity and tracks its application status.
6. User asks the AI assistant a question.
7. The assistant retrieves relevant profile/document/opportunity context and gives a grounded recommendation.
8. Dashboard shows tasks, deadlines, application pipeline, and progress.

## MVP Features

### 1. Career Profile
- Education
- Skills
- Experience
- Interests
- Career goals
- Resume upload

### 2. Goal Workspace
Each goal gets a dedicated workspace containing:
- Roadmap
- Milestones/tasks
- Opportunities
- Deadlines
- Documents/checklist
- Progress

### 3. AI Roadmap Generation
Given a goal and profile, generate:
- 4–6 milestones
- Concrete tasks under each milestone
- Suggested timeline
- Priority
- Rationale

### 4. Opportunity Discovery
MVP uses a **curated/mock opportunity dataset** so the demo is deterministic and does not depend on unreliable scraping.

Opportunity types:
- Jobs
- Internships
- Scholarships
- Master's programs
- Certifications

Users can search/filter and save opportunities.

### 5. Application Tracker
Statuses:
- Interested
- Preparing
- Applied
- Interview
- Accepted
- Rejected

### 6. RAG Career Assistant
The assistant retrieves context from:
- User profile
- Uploaded resume/documents
- Saved opportunities
- Goal/roadmap
- Curated career resources

Example questions:
- "Am I competitive for this scholarship?"
- "Which universities match my profile?"
- "What should I improve before applying?"
- "What should I work on next?"

The assistant should explicitly distinguish known context from assumptions and should cite the retrieved source/document inside the UI where practical.

### 7. Progress Dashboard
Show:
- Goal progress
- Completed tasks
- Upcoming deadlines
- Application pipeline
- Skills
- AI recommendations

## Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS

### Backend
- Python
- FastAPI
- Pydantic

### Database
- PostgreSQL
- pgvector for embeddings

### AI — Alibaba Cloud
- Alibaba Cloud Model Studio
- Qwen model for generation
- `text-embedding-v4` for RAG embeddings
- OpenAI-compatible API interface

Alibaba Cloud Model Studio currently exposes Qwen through OpenAI-compatible APIs, making the AI layer easy to isolate behind a provider class. `text-embedding-v4` is also available for semantic retrieval.

### Document Processing
- PyMuPDF / fitz for PDF text extraction
- Chunking + embeddings
- pgvector similarity search

### Development
- Git + GitHub
- Qoder / Claude as coding agents
- `.env` for secrets
- pytest for backend tests

## Architecture

```text
React + Vite + Tailwind (Vercel static build)
          |
          | REST / JSON — same-origin /api/* rewrites to the serverless function
          v
FastAPI (Vercel Python serverless function, api/index.py)
          |
    +-----+-------------------+
    |                         |
    v                         v
Supabase PostgreSQL       Alibaba Model Studio
(pgvector)                     |
    |                         +--> Qwen generation
    |                         +--> text-embedding-v4
    +--> users/profiles
    +--> goals
    +--> tasks
    +--> opportunities
    +--> applications
    +--> documents
    +--> document_chunks
```

## Repository Structure

```text
steerium/
├── frontend/            # React + Vite + Tailwind (Vercel static build)
│   ├── src/
│   └── package.json
├── backend/             # FastAPI app (run locally with uvicorn)
│   ├── app/
│   │   ├── api/         # routers
│   │   ├── core/        # config, database, security
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── services/    # AI provider, roadmap, documents, RAG
│   │   └── main.py
│   ├── alembic/         # migrations (run against Supabase)
│   └── requirements.txt # local dev dependencies
├── api/
│   └── index.py         # Vercel entrypoint — imports the FastAPI app
├── data/
│   └── opportunities.json
├── vercel.json          # build + routing config
├── requirements.txt     # serverless runtime dependencies
├── .python-version
├── .env.example
└── README.md
```

## Environment Variables

### Backend (`backend/.env`)

```env
# Supabase PostgreSQL (transaction pooler)
DATABASE_URL=postgresql+psycopg://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require

# Auth session signing — any random 32+ char string in production
SESSION_SECRET=change-me-in-production
ENV=development

# Alibaba Cloud Model Studio (Qwen AI)
MODEL_STUDIO_API_KEY=
MODEL_STUDIO_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
MODEL_STUDIO_MODEL=qwen-plus
MODEL_STUDIO_EMBEDDING_MODEL=text-embedding-v4

CORS_ORIGINS=http://localhost:5173
```

### Frontend (`frontend/.env`) — optional in dev

```env
# Backend base URL. Leave empty in dev (Vite proxies /api → localhost:8000)
# and for same-origin Vercel deployments. Set only when the API lives on
# a different domain than the frontend.
VITE_API_URL=
```

Do not commit real API keys.

### Demo account

The seed script (`backend/scripts/seed_db.py`) creates a demo user with `DEMO_EMAIL` / `DEMO_PASSWORD`. The login page has a **"Fill demo account"** button that pre-fills these defaults — judges can explore a fully-seeded workspace with one click.

## Local Development

The database is hosted PostgreSQL on Supabase — no local database or Docker
is needed. Set `DATABASE_URL` in `backend/.env` first (see above).

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt

# Run migrations against Supabase (creates users table + links profiles)
alembic upgrade head

# Seed demo data + create demo account
python scripts/seed_db.py

# Start server
uvicorn app.main:app --reload

# Tests
pytest
```

### Frontend

```bash
cd frontend
npm install
npm run dev

# Production build (tsc --noEmit + vite build)
npm run build
```

## Deployment (Vercel + Supabase)

One Vercel project serves everything: the React build as static assets and
the FastAPI app as a Python serverless function. Requests to `/api/*` are
rewritten to the function; every other path serves the SPA. Session cookies
work because frontend and API share one domain.

### 1. Supabase database

1. Create a project at [supabase.com](https://supabase.com) (region close to
   your users).
2. Enable the `vector` extension: Dashboard → **Database → Extensions →
   vector → Enable**.
3. Copy the **Connection Pooling / Transaction mode** connection string
   (port `6543`) from **Project Settings → Database** and use it as
   `DATABASE_URL` (append `?sslmode=require`). The engine detects the pooler
   and disables prepared statements automatically.
4. Run migrations and seed from your machine:

   ```bash
   cd backend
   pip install -r requirements.txt
   alembic upgrade head
   python scripts/seed_db.py
   ```

### 2. Vercel project

1. Push the repo to GitHub, then import it at
   [vercel.com/new](https://vercel.com/new). `vercel.json` already defines
   the build (`cd frontend && npm install && npm run build`), the output
   directory (`frontend/dist`), and routing — leave framework detection as
   "Other" if asked.
2. Add environment variables (Project Settings → Environment Variables,
   Production + Preview):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Supabase transaction-pooler URL from step 1 |
   | `SESSION_SECRET` | `python -c "import secrets; print(secrets.token_hex(32))"` |
   | `ENV` | `production` |
   | `MODEL_STUDIO_API_KEY` | Alibaba Cloud Model Studio key |
   | `MODEL_STUDIO_BASE_URL` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
   | `MODEL_STUDIO_MODEL` | `qwen-plus` |
   | `MODEL_STUDIO_EMBEDDING_MODEL` | `text-embedding-v4` |
   | `CORS_ORIGINS` | empty (same-origin) or your frontend domain for split deploys |

3. Deploy. Verify `https://<deployment>.vercel.app/api/health` returns
   `{"status": "ok", "database": "ok"}`.

`VITE_API_URL` stays **unset** for this setup — the frontend calls relative
`/api/*` paths on its own domain. Only set it (and matching `CORS_ORIGINS`)
if you split the API onto a separate domain.

### Deploying from the CLI instead

```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production
```

### Serverless limits to know

- Function timeout is 60s (`maxDuration` in `vercel.json`) — enough for
  Qwen roadmap/chat calls, but a hard ceiling.
- Request bodies are capped at ~4.5 MB, so document uploads above that size
  will fail (the app itself caps uploads at 10 MB).
- Alembic migrations and the seed script run from your machine against
  Supabase — there is no migration step on Vercel.

## MVP Non-Goals

Do **not** build these before the core workflow works:

- Real LinkedIn integration
- Real GitHub integration
- Production web-scale opportunity scraping
- Email automation
- Salary prediction
- Full ATS engine
- Interview simulator
- Complex multi-agent orchestration
- Mobile app
- Social/community features

These are stretch goals only.

## Stretch Goals

If the core demo is stable:
- Resume scoring / ATS analysis
- Skill-gap analysis
- GitHub integration
- LinkedIn integration
- Labor-market insights
- Interview preparation
- Email reminders
- Accountability check-ins

## Hackathon Principle

**Demo completeness beats feature count.**

The final product should make one user journey feel polished:

> "I tell Steerium where I want to go → it understands my background → builds my plan → helps me find relevant opportunities → tracks my applications → and answers questions using my actual career context."

## Source Brief

The product brief defines Steerium as a centralized career workspace and specifies the 7-day MVP workflow **Goal → Roadmap → Opportunities → Applications → Progress**, along with the core profile, workspace, RAG assistant, opportunity discovery, application tracker, and progress dashboard concepts.
