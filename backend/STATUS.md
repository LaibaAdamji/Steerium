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

### API Endpoints (12 routes)

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

### Pydantic Schemas
- `ProfileCreate` / `ProfileUpdate` / `ProfileResponse`
- `GoalCreate` / `GoalResponse` (nested milestones) / `GoalListResponse` (light)
- `MilestoneResponse` (nested tasks) / `TaskResponse`
- `OpportunityResponse`
- `ApplicationCreate` / `ApplicationUpdate` / `ApplicationResponse`
- `DashboardResponse` / `GoalSummary` / `MilestoneProgress` / `DeadlineItem` / `ApplicationPipeline` / `SavedOpportunityItem`

---

## Not Yet Started
- `POST /api/goals/{id}/generate-roadmap` — AI roadmap generation via Qwen
- `POST /api/documents` — Document upload + PDF extraction
- `POST /api/chat` — RAG career assistant
- AI provider abstraction (`AIProvider` / `AlibabaModelStudioProvider`)
- Embedding pipeline for `document_chunks`
- Opportunity match scoring
- Resume/ATS scoring (P1)
