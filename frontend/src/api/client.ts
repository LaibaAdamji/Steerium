// Thin fetch wrapper over the FastAPI backend. All request paths are
// relative in dev (proxied to :8000 by Vite) and prefixed with VITE_API_URL
// in production deployments. Cookies ride along for session auth.
import type {
  Application,
  AuthResponse,
  ChatResponse,
  Dashboard,
  DocumentDetail,
  DocumentItem,
  Goal,
  GoalCreateInput,
  GoalListItem,
  LoginInput,
  Opportunity,
  Profile,
  SignupInput,
} from "./types";

// Same-origin by default (dev proxy / reverse proxy); override for split deploys.
const API_BASE = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Human-readable message for unexpected failures — technical details stay in the console. */
export function friendlyError(err: unknown): string {
  console.error(err);
  if (err instanceof ApiError) return err.message;
  return "Something went wrong. Please try again.";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail))
        detail = body.detail.map((d: { msg?: string }) => d.msg).join("; ");
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// --- Auth ---

export function signup(data: SignupInput): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/signup", jsonInit("POST", data));
}

export function login(data: LoginInput): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/login", jsonInit("POST", data));
}

export function logout(): Promise<{ message: string }> {
  return request<{ message: string }>("/api/auth/logout", { method: "POST" });
}

export function getCurrentUser(): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/me");
}

// --- Profile ---

export function getProfile(): Promise<Profile> {
  return request<Profile>("/api/profile");
}

export function updateProfile(data: Partial<Profile>): Promise<Profile> {
  return request<Profile>("/api/profile", jsonInit("PUT", data));
}

// --- Goals & roadmap ---

export function listGoals(): Promise<GoalListItem[]> {
  return request<GoalListItem[]>("/api/goals");
}

export function createGoal(data: GoalCreateInput): Promise<Goal> {
  return request<Goal>("/api/goals", jsonInit("POST", data));
}

export function getGoal(id: string): Promise<Goal> {
  return request<Goal>(`/api/goals/${id}`);
}

export function generateRoadmap(goalId: string): Promise<Goal> {
  return request<Goal>(`/api/goals/${goalId}/generate-roadmap`, { method: "POST" });
}

export function updateRoadmapItem(
  itemId: string,
  data: { completed?: boolean; status?: string },
): Promise<unknown> {
  return request(`/api/roadmap-items/${itemId}`, jsonInit("PATCH", data));
}

// --- Opportunities ---

export interface OpportunityFilters {
  type?: string;
  search?: string;
  tag?: string;
}

export function listOpportunities(filters: OpportunityFilters = {}): Promise<Opportunity[]> {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.search) params.set("search", filters.search);
  if (filters.tag) params.set("tag", filters.tag);
  const qs = params.toString();
  return request<Opportunity[]>(`/api/opportunities${qs ? `?${qs}` : ""}`);
}

export function listSavedOpportunityIds(): Promise<string[]> {
  return request<string[]>("/api/opportunities/saved");
}

export function saveOpportunity(opportunityId: string): Promise<unknown> {
  return request(`/api/opportunities/${opportunityId}/save`, { method: "POST" });
}

export function unsaveOpportunity(opportunityId: string): Promise<unknown> {
  return request(`/api/opportunities/${opportunityId}/save`, { method: "DELETE" });
}

// --- Applications ---

export function listApplications(status?: string): Promise<Application[]> {
  const qs = status ? `?status=${status}` : "";
  return request<Application[]>(`/api/applications${qs}`);
}

export function createApplication(
  opportunityId: string,
  status = "interested",
  notes?: string,
): Promise<Application> {
  return request<Application>(
    "/api/applications",
    jsonInit("POST", { opportunity_id: opportunityId, status, notes }),
  );
}

export function updateApplication(
  applicationId: string,
  data: { status?: string; notes?: string },
): Promise<Application> {
  return request<Application>(`/api/applications/${applicationId}`, jsonInit("PATCH", data));
}

// --- Dashboard ---

export function getDashboard(): Promise<Dashboard> {
  return request<Dashboard>("/api/dashboard");
}

// --- Documents ---

export function listDocuments(): Promise<DocumentItem[]> {
  return request<DocumentItem[]>("/api/documents");
}

export function uploadDocument(file: File, documentType: string): Promise<DocumentDetail> {
  const form = new FormData();
  form.append("file", file);
  form.append("document_type", documentType);
  return request<DocumentDetail>("/api/documents", { method: "POST", body: form });
}

export function getDocument(id: string): Promise<DocumentDetail> {
  return request<DocumentDetail>(`/api/documents/${id}`);
}

export function deleteDocument(id: string): Promise<void> {
  return request<void>(`/api/documents/${id}`, { method: "DELETE" });
}

// --- Chat ---

export function chat(question: string): Promise<ChatResponse> {
  return request<ChatResponse>("/api/chat", jsonInit("POST", { question }));
}
