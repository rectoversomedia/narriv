/** Visibility citations, workspaces, members, keyword runs and platform collection. Re-exported from @/lib/api-service. */

import { apiClient } from "@/lib/apiClient";
import { Alert, AssignmentInput, EscalationLevel, MetaPaginatedResponse } from "./core";

// ---------------------------------------------------------------------------
export interface VisibilityCitation {
  domain: string;
  type: string;
  typeColor: string;
  freq: number;
  authority: number;
  brandC: number;
  compC: number;
}

export interface VisibilityResponse {
  score?: number | string;
  presence?: number | string;
  presenceMentions?: number | string;
  competitor?: number | string;
  prompts?: {
    prompt: string;
    engine: string;
    brand: string;
    competitor: string;
    brandTone?: string;
    compTone?: string;
  }[];
  citations?: VisibilityCitation[];
  geoActions?: { title: string; tag: string; highlighted?: boolean }[];
}

export async function updateAlertAssignment(id: string, input: AssignmentInput): Promise<Alert | null> {
  try {
    return await apiClient<Alert>(`/api/alerts/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export interface ActionPlanResponse {
  id?: string;
  inputNarrative?: string;
  evidenceSummary?: string;
  outputs?: [string, string][];
  plan?: [string, string][];
  assignedTo?: string | null;
  assignedTeam?: string | null;
  deadline?: string | null;
  escalationLevel?: EscalationLevel | null;
  workflowStatus?: string | null;
}

export interface ActionPlanLearningResponse {
  insights: Array<{
    type: "acceptance_rate" | "avg_rating" | "improvement" | string;
    value: number;
  }>;
  /** Generated assets from this plan that were rated 4 or higher. */
  templates: Array<{
    id: string;
    type: string;
    content: string;
  }>;
  stats?: { totalFeedback: number; accepted: number; rejected: number; edited: number; assetsGenerated: number };
}

export async function getActionPlanLearning(id: string): Promise<ActionPlanLearningResponse | null> {
  try {
    return await apiClient<ActionPlanLearningResponse>(`/api/action-plans/${id}/learning`);
  } catch {
    return null;
  }
}

export type ActionStrategyType =
  | "pr_response"
  | "content_strategy"
  | "influencer_strategy"
  | "crisis_response"
  | "social_response"
  | "stakeholder_update"
  | "data_driven";

export interface CreateActionPlanInput {
  workspaceId?: string;
  strategyType: ActionStrategyType;
  alertId?: string;
  clusterId?: string;
  signalId?: string;
}

export interface CreatedActionPlan {
  id: string;
  title: string;
  strategyType: ActionStrategyType;
  createdAt: string;
}

export interface ActionQueueRecord {
  id: string;
  title: string;
  alert?: { title: string; severity: string | null } | null;
  cluster?: { title: string; sentiment: string | null } | null;
  assignedTo?: string | null;
  assignedTeam?: string | null;
  deadline?: string | null;
  escalationLevel?: EscalationLevel | null;
  workflowStatus?: string | null;
  createdAt: string;
}

export async function getActionPlans(): Promise<ActionPlanResponse | null> {
  try {
    return await apiClient<ActionPlanResponse>("/api/action-plans");
  } catch {
    return null;
  }
}

export async function getActionPlanById(id: string): Promise<ActionPlanResponse | null> {
  if (!id) return null;
  try {
    return await apiClient<ActionPlanResponse>(`/api/action-plans/${id}`);
  } catch {
    return null;
  }
}

// Throws with the backend's message (budget, AI unavailable, not found) so the UI can say why.
export async function createActionPlan(input: CreateActionPlanInput): Promise<CreatedActionPlan> {
  return apiClient<CreatedActionPlan>("/api/actions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateActionPlanAssignment(id: string, input: AssignmentInput): Promise<ActionPlanResponse | null> {
  try {
    return await apiClient<ActionPlanResponse>(`/api/action-plans/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function getActionQueue(
  options: { page?: number; limit?: number; search?: string; priority?: string; status?: string } = {}
): Promise<MetaPaginatedResponse<ActionQueueRecord> | null> {
  const { page = 1, limit = 10, search, priority, status } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("search", search);
  if (priority && priority !== "all") params.set("priority", priority);
  if (status && status !== "all") params.set("status", status);

  try {
    return await apiClient<MetaPaginatedResponse<ActionQueueRecord>>(`/api/actions?${params.toString()}`);
  } catch {
    return null;
  }
}

export interface CurrentUserResponse {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface WorkspaceSettingsResponse {
  workspaceId: string;
  brandName: string | null;
  industry: string | null;
  timezone: string | null;
  notificationEmail: string | null;
  whatsappPIC: string | null;
  /** Language of the content Narriv writes and stores for the workspace (alerts); "id" by default. */
  language: "id" | "en";
  logoUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  onboarding_completed?: boolean;
  /** Scheduled monitoring is paused for this workspace (Settings → Danger zone). */
  monitoringPaused: boolean;
  /** Plan and trial, set by the Narriv team; null fields on workspaces from before plans existed. */
  planStatus: PlanStatus;
}

export type WorkspacePlanKey = "trial" | "pilot" | "intelligence" | "decision" | "command";
export interface PlanStatus {
  plan: WorkspacePlanKey | null;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  trialExpired: boolean;
}

export interface UpdateWorkspaceSettingsInput {
  brandName?: string | null;
  industry?: string | null;
  timezone?: string | null;
  notificationEmail?: string | null;
  whatsappPIC?: string | null;
  language?: "id" | "en";
}

export interface WorkspaceMemberRecord {
  id: string;
  workspaceId: string;
  userId: string;
  role: "owner" | "admin" | "analyst" | string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

export type WorkspaceMemberRole = "owner" | "admin" | "analyst";

export type CreateWorkspaceMemberInput =
  | { userId: string; role: WorkspaceMemberRole; workspaceId?: string }
  | { email: string; name?: string; role: WorkspaceMemberRole; workspaceId?: string };

export async function getCurrentUser(): Promise<CurrentUserResponse | null> {
  try {
    return await apiClient<CurrentUserResponse>("/auth/me");
  } catch {
    return null;
  }
}

export async function getWorkspaceSettings(): Promise<WorkspaceSettingsResponse | null> {
  try {
    const raw = await apiClient<Record<string, unknown>>("/api/workspace/settings");
    if (!raw) return null;
    return {
      workspaceId: (raw.workspaceId as string) || (raw.workspace_id as string) || "",
      brandName: (raw.brandName as string) || (raw.brand_name as string) || null,
      industry: (raw.industry as string) || null,
      timezone: (raw.timezone as string) || null,
      notificationEmail: (raw.notificationEmail as string) || (raw.notification_email as string) || null,
      whatsappPIC: (raw.whatsappPIC as string) || (raw.whatsapp_pic as string) || null,
      language: raw.language === "en" ? "en" : "id",
      logoUrl: (raw.logoUrl as string) || (raw.logo_url as string) || null,
      createdAt: (raw.createdAt as string) || (raw.created_at as string) || null,
      updatedAt: (raw.updatedAt as string) || (raw.updated_at as string) || null,
      onboarding_completed: raw.onboarding_completed as boolean | undefined,
      monitoringPaused: raw.monitoring_paused === true,
      planStatus: (raw.plan_status as PlanStatus | undefined) ?? { plan: null, trialEndsAt: null, trialDaysLeft: null, trialExpired: false },
    };
  } catch {
    return null;
  }
}

export async function setMonitoringPaused(paused: boolean): Promise<boolean> {
  const res = await apiClient<{ monitoring_paused: boolean }>("/api/workspace/monitoring-pause", {
    method: "POST",
    body: JSON.stringify({ paused }),
  });
  return res.monitoring_paused;
}

/** Deletes the current workspace. Rejects with code WORKSPACE_DELETE_RESTRICTED (409) while it still holds data. */
export async function deleteCurrentWorkspace(reason: string): Promise<void> {
  await apiClient<{ success: boolean }>("/api/workspace", {
    method: "DELETE",
    body: JSON.stringify({ reason, confirmText: "DELETE_WORKSPACE" }),
  });
}

export async function updateWorkspaceSettings(input: UpdateWorkspaceSettingsInput): Promise<WorkspaceSettingsResponse | null> {
  try {
    return await apiClient<WorkspaceSettingsResponse>("/api/workspace/settings", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export interface MonitoringKeyword {
  id: string;
  keyword: string;
  isActive: boolean;
  scheduled: boolean;
  createdAt: string;
  updatedAt: string | null;
  monitoringStatus?: "active" | "failing" | "paused" | "awaiting_first_run" | "not_in_rotation";
  lastRun?: { at: string; status: string; fetched: number | null; inserted: number | null; deduplicated: number | null; errorCategory: string | null } | null;
}

export interface MonitoringKeywordsResponse {
  data: MonitoringKeyword[];
  limits: { maxActive: number; scheduledPerRun: number };
  note: string;
  canEdit?: boolean;
  runHistoryAvailable?: boolean;
}

// --- Client workspaces -----------------------------------------------------

export interface WorkspaceSummary {
  id: string;
  name: string;
  role: "owner" | "admin" | "analyst" | "viewer" | null;
  createdAt?: string;
  isDemo?: boolean;
}

export async function listMyWorkspaces(): Promise<{ data: WorkspaceSummary[]; currentWorkspaceId: string | null }> {
  return apiClient("/api/workspaces");
}

export async function createClientWorkspace(input: { name: string; industry?: string | null }): Promise<{ data: WorkspaceSummary }> {
  return apiClient("/api/workspaces", { method: "POST", body: JSON.stringify(input) });
}

// --- Keyword monitoring runs -------------------------------------------------

export interface KeywordRunResult {
  workspaceId?: string;
  keyword: string;
  status: "ok" | "failed" | "deferred";
  fetched?: number;
  inserted?: number;
  deduplicated?: number;
  analyzed?: number;
  analysisFailed?: number;
  error?: string;
  errorCategory?: string;
}

export interface MonitoringRunResponse {
  runId: string;
  status: "completed" | "completed_with_errors" | "partial" | "failed" | "skipped_overlap";
  keywords: number;
  totals: { fetched: number; inserted: number; deduplicated: number; analyzed: number; analysisFailed: number; failedKeywords: number; deferredKeywords: number };
  durationMs: number;
  results: KeywordRunResult[];
}

/** Owner/admin: run monitoring now for the selected workspace's active keywords. Throws with the server message (no keywords, cooldown, permission). */
export async function runKeywordMonitoring(): Promise<MonitoringRunResponse> {
  return apiClient<MonitoringRunResponse>("/api/ingestion/run-keywords", { method: "POST", body: JSON.stringify({}), timeout: 130000 });
}

// --- Platform collection (Apify) -----------------------------------------------

export interface PlatformCollection {
  id: string;
  status: "starting" | "running" | "persisting" | "completed" | "completed_empty" | "completed_with_errors" | "failed" | "skipped_overlap" | string;
  preset: string;
  sourceId?: string | null;
  platform: string;
  keyword: string;
  apifyStatus: string | null;
  startedAt: string;
  finishedAt: string | null;
  costUsd: number | null;
  error: string | null;
  checkError?: string;
  totals: { datasetItems: number; inserted: number; deduplicated: number; invalid: number; analyzed: number; analysisFailed: number; insertFailed: number } | null;
}
export interface PlatformCollectionsResponse { configured: boolean; presets: { key: string; platform: string }[]; data: PlatformCollection[] }

export async function getPlatformCollections(): Promise<PlatformCollectionsResponse> {
  return apiClient<PlatformCollectionsResponse>("/api/ingestion/collect");
}

/** Starts one capped Apify run, by preset (Settings) or by source card. */
export async function startPlatformCollection(args: { preset?: string; sourceId?: string; keyword?: string }): Promise<{ data: PlatformCollection }> {
  return apiClient("/api/ingestion/collect", { method: "POST", body: JSON.stringify(args), timeout: 60000 });
}

/** Checks the run on Apify and stores its results once it has finished. */
export async function syncPlatformCollection(id: string): Promise<{ data: PlatformCollection }> {
  return apiClient(`/api/ingestion/collect/${encodeURIComponent(id)}`, { timeout: 130000 });
}

// --- AI providers (admin visibility) -------------------------------------------

export interface AiWorkflowRoute { workflow: string; provider: string | null; model: string | null; routed: boolean; note?: string }
export interface AiProvidersResponse {
  profile: string;
  workflows: AiWorkflowRoute[];
  providers: { openai: { configured: boolean }; anthropic: { configured: boolean } };
}
export interface AiProviderCheck { configured: boolean; ok?: boolean; model?: string; latencyMs?: number; error?: string; status?: number | null }
export interface ApifyAccountCheck { configured: boolean; ok?: boolean; latencyMs?: number; error?: string; status?: number | null; plan?: string | null; monthlyUsageUsd?: number | null; monthlyLimitUsd?: number | null; remainingUsd?: number | null; cycleEnd?: string | null }

export async function getAiProviders(): Promise<AiProvidersResponse> {
  return apiClient<AiProvidersResponse>("/api/ai/providers");
}

export async function checkAiProviders(): Promise<{ checkedAt: string; profile: string; results: { openai: AiProviderCheck; anthropic: AiProviderCheck; apify?: ApifyAccountCheck } }> {
  return apiClient("/api/ai/providers/check", { method: "POST", body: JSON.stringify({}), timeout: 60000 });
}

// Keyword calls throw (with the backend error message) so the UI can show
// duplicate / limit / permission errors instead of failing silently.
export async function getMonitoringKeywords(): Promise<MonitoringKeywordsResponse> {
  return apiClient<MonitoringKeywordsResponse>("/api/workspace/keywords");
}

export async function createMonitoringKeyword(keyword: string): Promise<MonitoringKeywordsResponse> {
  return apiClient<MonitoringKeywordsResponse>("/api/workspace/keywords", {
    method: "POST",
    body: JSON.stringify({ keyword }),
  });
}

export async function updateMonitoringKeyword(id: string, input: { keyword?: string; isActive?: boolean }): Promise<MonitoringKeywordsResponse> {
  return apiClient<MonitoringKeywordsResponse>(`/api/workspace/keywords/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteMonitoringKeyword(id: string): Promise<MonitoringKeywordsResponse> {
  return apiClient<MonitoringKeywordsResponse>(`/api/workspace/keywords/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function getWorkspaceMembers(): Promise<WorkspaceMemberRecord[] | null> {
  try {
    // The API returns snake_case rows; normalize to the camelCase record shape.
    const response = await apiClient<{ data: Array<Record<string, unknown>> }>("/api/workspace/members");
    return (response.data || []).map((m) => ({
      ...(m as object),
      id: String(m.id),
      workspaceId: String(m.workspaceId ?? m.workspace_id ?? ""),
      userId: String(m.userId ?? m.user_id ?? ""),
      role: String(m.role ?? ""),
      createdAt: String(m.createdAt ?? m.created_at ?? ""),
      user: m.user && !Array.isArray(m.user) ? (m.user as WorkspaceMemberRecord["user"]) : undefined,
    })) as WorkspaceMemberRecord[];
  } catch {
    return null;
  }
}

export async function createWorkspaceMember(input: CreateWorkspaceMemberInput): Promise<WorkspaceMemberRecord | null> {
  try {
    return await apiClient<WorkspaceMemberRecord>("/api/workspace/members", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function deleteWorkspaceMember(memberId: string): Promise<boolean> {
  try {
    await apiClient<{ success: boolean }>(`/api/workspace/members/${memberId}`, {
      method: "DELETE",
    });
    return true;
  } catch {
    return false;
  }
}

export async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<boolean> {
  try {
    await apiClient<{ success: boolean }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return true;
  } catch {
    return false;
  }
}
