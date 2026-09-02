# Backend Status

## Completed

### Foundation
- FastAPI app with CORS middleware and environment-driven configuration
- SQLAlchemy engine + session management (sync psycopg driver)
- Pydantic Settings for centralized config (`.env` driven, no hardcoded secrets)
- Alembic migration for full database schema (8 tables, 7 enum types, pgvector)
- `GET /api/health` — DB connectivity probe

### Data Models (8 tables)
| Model | Table | Purpose |
|---|---|---|
| `Profile` | `profiles` | Single-tenant "user" — JSON fields for education, skills, experience, interests |
| `Goal` | `goals` | Career goal with target date and status tracking |
| `RoadmapItem` | `roadmap_items` | Collapsed milestones + tasks (distinguished by `type`, tasks linked via `parent_id`) |
| `Opportunity` | `opportunities` | Curated/seeded records — programs, scholarships, internships, jobs, certifications |
| `SavedOpportunity` | `saved_opportunities` | Profile-to-opportunity bookmark (composite PK join table) |
| `Application` | `applications` | Tracked application with 6-state status pipeline |
| `Document` | `documents` | Uploaded resumes/transcripts with extracted text |
| `DocumentChunk` | `document_chunks` | RAG text chunks with `vector(1024)` embeddings (pgvector) |

### Enums
`GoalStatus` · `RoadmapItemType` · `RoadmapItemStatus` · `Priority` · `OpportunityType` · `ApplicationStatus` · `DocumentType`

### Seed Data
- **Demo profile** — Ayesha Khan (CS student, FAST-NUCES)
- **Demo goal** — "MS in Computer Science — Fall 2028" with 6 milestones and 12 tasks
- **17 curated opportunities** from `data/opportunities.json` (4 master's programs, 5 scholarships, 4 internships, 1 job, 3 certifications)

### AI Layer (Phase 1)
- `app/services/ai_provider.py` — provider abstraction: `AIProvider` protocol (`chat_text`, `chat_json`, `embed`) + `AlibabaModelStudioProvider` (openai SDK against Model Studio's OpenAI-compatible endpoint, JSON mode, markdown-fence-tolerant JSON parsing, `set_ai_provider()` test seam)
- `app/services/roadmap_generator.py` — prompt construction from goal + profile context, payload validation (4–6 milestones × 2–4 tasks, priority normalization), persistence as `roadmap_items` tree; regeneration replaces the existing roadmap; provider failures abort **before** any DB writes
- `POST /api/goals/{id}/generate-roadmap` — 404 unknown goal, 502 on AI failure (existing roadmap kept), 200 with full goal + new milestone→task tree

### Documents + RAG (Phase 2)
- `app/services/document_service.py` — text extraction (PyMuPDF for PDFs, UTF-8 for .txt/.md, 10 MB cap), paragraph-aware chunking (~600 chars, 100 overlap), embedding ingestion into `document_chunks` (pgvector). Embedding failure is non-fatal: chunks persist with null embeddings and retrieval falls back to keyword search
- `app/services/rag.py` — retrieval (pgvector cosine top-5 with keyword ILIKE fallback, mode reported per request) + context assembly (profile, active goal, saved opportunities, application statuses, retrieved chunks) + grounding prompt that distinguishes known facts from assumptions and cites filenames
- `POST /api/documents` (multipart upload), `GET /api/documents`, `GET /api/documents/{id}` (extraction status), `DELETE /api/documents/{id}` (cascades chunks)
- `POST /api/chat` — 404 no profile, 422 bad question, 502 on AI failure; returns answer + citations (document_id, filename, chunk_index, snippet, similarity) + retrieval_mode
- 36 pytest tests pass (20 new for documents + chat; provider faked, tiny in-memory PDFs generated with PyMuPDF itself)

### Infrastructure
- Database migrated to Supabase (transaction pooler, port 6543, `sslmode=require`); engine sets `prepare_threshold=None` for pooler URLs; pgvector 0.8.2 enabled; schema stamped at `a52e4c3a828b` (tables pre-existed from an earlier `create_all`); seeded (demo profile, goal + 6 milestones/12 tasks, 17 opportunities)
- `alembic==1.13.2`, `openai==3.6.0`, `pymupdf==1.24.9`, `python-multipart==0.0.12` added to `requirements.txt`

### API Endpoints (18 routes)

#### Profile
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/profile` | Returns the first (demo) profile |
| `POST` | `/api/profile` | Create profile (409 if one exists) |
| `PUT` | `/api/profile` | Idempotent upsert |
| `GET` | `/api/profile/{id}` | Get by UUID |

#### Goals
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/goals` | List goals (optional `profile_id` filter) |
| `POST` | `/api/goals` | Create a goal |
| `GET` | `/api/goals/{id}` | Full goal with nested milestone→task tree |
| `POST` | `/api/goals/{id}/generate-roadmap` | Generate/regenerate the roadmap with Qwen (replaces existing) |

#### Opportunities
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/opportunities` | List with filters: `type`, `search`, `tag`, `deadline_after`, `deadline_before` |
| `POST` | `/api/opportunities/{id}/save` | Bookmark an opportunity |
| `DELETE` | `/api/opportunities/{id}/save` | Remove bookmark |
| `GET` | `/api/opportunities/saved` | Saved opportunity IDs for a profile |

#### Applications
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/applications` | List applications (filter by `profile_id`, `status`) |
| `POST` | `/api/applications` | Create application from opportunity |
| `PATCH` | `/api/applications/{id}` | Update status/notes (auto-sets `applied_at` on status transition) |

#### Dashboard
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/dashboard` | Aggregated view — active goal progress, milestone completion counts, upcoming deadlines (roadmap + opportunities), application pipeline counts, saved opportunities not yet applied |

#### Documents
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/documents` | Upload .pdf/.txt/.md (multipart) — extracts text, chunks, embeds (best-effort) |
| `GET` | `/api/documents` | List documents (optional `profile_id` filter) |
| `GET` | `/api/documents/{id}` | Detail incl. extracted text, chunk count, embedded flag |
| `DELETE` | `/api/documents/{id}` | Delete document + chunks |

#### Chat
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat` | RAG career assistant — grounded answer + citations + retrieval_mode |

### Pydantic Schemas
- `ProfileCreate` / `ProfileUpdate` / `ProfileResponse`
- `GoalCreate` / `GoalResponse` (nested milestones) / `GoalListResponse` (light)
- `MilestoneResponse` (nested tasks) / `TaskResponse`
- `OpportunityResponse`
- `ApplicationCreate` / `ApplicationUpdate` / `ApplicationResponse`
- `DashboardResponse` / `GoalSummary` / `MilestoneProgress` / `DeadlineItem` / `ApplicationPipeline` / `SavedOpportunityItem`
- `DocumentResponse` / `DocumentDetailResponse`
- `ChatRequest` / `ChatResponse` / `Citation`

---

## Not Yet Started
- Opportunity match scoring
- Resume/ATS scoring (P1)
- Frontend (React + Vite + Tailwind) — not scaffolded yet
- **Live AI features need `MODEL_STUDIO_API_KEY` in `backend/.env`** — until set: roadmap generation and chat return 502 with a clear message; document upload still works (chunks stored un-embedded, chat retrieval falls back to keyword mode)
