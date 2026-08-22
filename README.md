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
React + Vite + Tailwind
          |
          | REST / JSON
          v
      FastAPI API
          |
    +-----+-------------------+
    |                         |
    v                         v
PostgreSQL + pgvector     Alibaba Model Studio
    |                         |
    |                         +--> Qwen generation
    |                         +--> text-embedding-v4
    |
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
├── frontend/
│   ├── src/
│   └── ...
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   └── tests/
├── data/
│   └── opportunities.json
├── docs/
├── .env.example
├── .gitignore
└── README.md
```

## Environment Variables

```env
MODEL_STUDIO_API_KEY=
MODEL_STUDIO_BASE_URL=
MODEL_STUDIO_MODEL=qwen-plus
MODEL_STUDIO_EMBEDDING_MODEL=text-embedding-v4

DATABASE_URL=

CORS_ORIGINS=http://localhost:5173
```

Do not commit real API keys.

## Local Development

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

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
