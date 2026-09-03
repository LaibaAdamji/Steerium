// Mirror of the FastAPI Pydantic response schemas (backend/app/schemas).

// --- Auth ---

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  profile: Profile | null;
}

export interface SignupInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ExperienceItem {
  title?: string;
  org?: string;
  description?: string;
  dates?: string;
}

export interface Profile {
  id: string;
  name: string;
  education: Record<string, string> | null;
  skills: string[] | null;
  experience: ExperienceItem[] | null;
  interests: string[] | null;
  career_goals: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  rationale?: string | null;
  order: number;
  priority: string;
  status: string;
  due_date?: string | null;
  completed: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string | null;
  rationale?: string | null;
  order: number;
  priority: string;
  status: string;
  due_date?: string | null;
  completed: boolean;
  tasks: Task[];
}

export interface GoalListItem {
  id: string;
  title: string;
  description?: string | null;
  target_date?: string | null;
  status: string;
  created_at: string;
}

export interface Goal extends GoalListItem {
  profile_id: string;
  updated_at: string;
  milestones: Milestone[];
}

export interface Opportunity {
  id: string;
  type: string;
  title: string;
  organization?: string | null;
  description?: string | null;
  location?: string | null;
  deadline?: string | null;
  url?: string | null;
  requirements?: string[] | null;
  tags?: string[] | null;
  created_at: string;
}

export interface Application {
  id: string;
  profile_id: string;
  opportunity_id: string;
  status: string;
  notes?: string | null;
  applied_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MilestoneProgress {
  id: string;
  title: string;
  order: number;
  completed: boolean;
  task_count: number;
  completed_task_count: number;
}

export interface GoalSummary {
  id: string;
  title: string;
  description?: string | null;
  target_date?: string | null;
  status: string;
  milestones_completed: number;
  milestones_total: number;
  tasks_completed: number;
  tasks_total: number;
  milestones: MilestoneProgress[];
}

export interface NextTask {
  id: string;
  title: string;
  milestone_title?: string | null;
  rationale?: string | null;
  priority: string;
  due_date?: string | null;
}

export interface DeadlineItem {
  title: string;
  due_date?: string | null;
  source: string; // "roadmap" | "opportunity"
  item_id: string;
}

export interface ApplicationPipeline {
  interested: number;
  preparing: number;
  applied: number;
  interview: number;
  accepted: number;
  rejected: number;
  total: number;
}

export interface SavedOpportunityItem {
  id: string;
  title: string;
  type: string;
  organization?: string | null;
  deadline?: string | null;
}

export interface Dashboard {
  profile_name?: string | null;
  goal?: GoalSummary | null;
  next_task?: NextTask | null;
  upcoming_deadlines: DeadlineItem[];
  application_pipeline: ApplicationPipeline;
  saved_opportunities: SavedOpportunityItem[];
  ai_recommendation?: string | null;
}

export interface DocumentItem {
  id: string;
  profile_id: string;
  filename: string;
  document_type: string;
  uploaded_at: string;
}

export interface DocumentDetail extends DocumentItem {
  extracted_text?: string | null;
  chunk_count: number;
  embedded: boolean;
}

export interface Citation {
  document_id: string;
  filename: string;
  chunk_index: number;
  snippet: string;
  score?: number | null;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  retrieval_mode: string; // "vector" | "keyword" | "none"
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  retrievalMode?: string;
}

export interface GoalCreateInput {
  title: string;
  description?: string | null;
  target_date?: string | null;
}

export const OPPORTUNITY_TYPES = [
  "masters_program",
  "scholarship",
  "internship",
  "job",
  "certification",
] as const;

export const APPLICATION_STATUSES = [
  "interested",
  "preparing",
  "applied",
  "interview",
  "accepted",
  "rejected",
] as const;
