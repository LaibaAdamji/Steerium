// Thin fetch wrapper over the FastAPI backend. All paths are relative and
// proxied to :8000 by Vite in dev (see vite.config.ts).
import type {
  Application,
  ChatResponse,
  Dashboard,
  DocumentDetail,
  DocumentItem,
  Goal,
  GoalListItem,
  Opportunity,
  Profile,
} from "./types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
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

export function listSavedOpportunityIds(profileId: string): Promise<string[]> {
  return request<string[]>(`/api/opportunities/saved?profile_id=${profileId}`);
}

export function saveOpportunity(opportunityId: string, profileId: string): Promise<unknown> {
  return request(`/api/opportunities/${opportunityId}/save?profile_id=${profileId}`, {
    method: "POST",
  });
}

export function unsaveOpportunity(opportunityId: string, profileId: string): Promise<unknown> {
  return request(`/api/opportunities/${opportunityId}/save?profile_id=${profileId}`, {
    method: "DELETE",
  });
}

// --- Applications ---

export function listApplications(profileId: string): Promise<Application[]> {
  return request<Application[]>(`/api/applications?profile_id=${profileId}`);
}

export function createApplication(
  profileId: string,
  opportunityId: string,
  status = "interested",
): Promise<Application> {
  return request<Application>(
    "/api/applications",
    jsonInit("POST", { profile_id: profileId, opportunity_id: opportunityId, status }),
  );
}

export function updateApplication(
  applicationId: string,
  data: { status?: string; notes?: string },
): Promise<Application> {
  return request<Application>(`/api/applications/${applicationId}`, jsonInit("PATCH", data));
}

// --- Dashboard ---

export function getDashboard(profileId?: string): Promise<Dashboard> {
  const qs = profileId ? `?profile_id=${profileId}` : "";
  return request<Dashboard>(`/api/dashboard${qs}`);
}

// --- Documents ---

export function listDocuments(profileId?: string): Promise<DocumentItem[]> {
  const qs = profileId ? `?profile_id=${profileId}` : "";
  return request<DocumentItem[]>(`/api/documents${qs}`);
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
