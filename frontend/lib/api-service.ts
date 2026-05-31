/**
 * api-service.ts
 *
 * Production API service layer for Narriv.
 * Wraps apiClient with typed fetchers for each domain.
 * Returns null when the backend is unreachable so pages can show production empty/error states.
 *
 * Usage:
 *   import { getDashboardSummary, getSignals, getAlerts } from "@/lib/api-service";
 */

import { apiClient } from "@/lib/apiClient";

// ---------------------------------------------------------------------------
// Types — shaped to match actual backend responses
// ---------------------------------------------------------------------------

export interface DashboardKPIs {
  total_signals: number;
  analyzed_signals: number;
  positive_percentage: number;
  negative_percentage: number;
  neutral_percentage: number;
  mixed_percentage: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface PlatformCount {
  platform: string;
  count: number;
}

export interface LatestSignal {
  id: string;
  title: string;
  platform: string;
  sentiment: string;
  published_at: string;
}

export interface DashboardSummary {
  kpis: DashboardKPIs;
  trends: TrendPoint[];
  sentiment_distribution: { positive: number; negative: number; neutral: number; mixed: number };
  platform_distribution: PlatformCount[];
  latest_signals: LatestSignal[];
}

export type DateRangeKey = "24h" | "7d" | "30d";

export interface DateRangeOptions {
  startDate?: string;
  endDate?: string;
}

export function getDateRangeOptions(range: DateRangeKey): DateRangeOptions {
  const end = new Date();
  const start = new Date(end);

  if (range === "24h") {
    start.setHours(start.getHours() - 24);
  } else if (range === "7d") {
    start.setDate(start.getDate() - 7);
  } else {
    start.setDate(start.getDate() - 30);
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

export interface Signal {
  id: string;
  title: string | null;
  content: string;
  platform: string | null;
  sentiment: string | null;
  publishedAt: string | null;
  capturedAt: string;
}

export interface SignalAnalysis {
  id: string;
  signalId: string;
  sentiment: string | null;
  narrativeType: string | null;
  stakeholder: string | null;
  impact: string | null;
  summary: string | null;
  recommendedAction: string | null;
  confidenceScore: number | null;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface MetaPaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

export interface Alert {
  id: string;
  title: string;
  whatHappened: string | null;
  whyItMatters: string | null;
  whatToDo: string | null;
  severity: string | null;
  status: string;
  type: string | null;
  assignedTo?: string | null;
  assignedTeam?: string | null;
  deadline?: string | null;
  escalationLevel?: EscalationLevel | null;
  workflowStatus?: string | null;
  createdAt: string;
}

export type EscalationLevel = "low" | "medium" | "high" | "critical";

export interface AssignmentInput {
  assignedTo?: string | null;
  assignedTeam?: string | null;
  deadline?: string | null;
  escalationLevel?: EscalationLevel;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getDashboardSummary(options: DateRangeOptions = {}): Promise<DashboardSummary | null> {
  const params = new URLSearchParams();
  if (options.startDate) params.set("startDate", options.startDate);
  if (options.endDate) params.set("endDate", options.endDate);
  const query = params.toString();

  try {
    return await apiClient<DashboardSummary>(`/api/dashboard/summary${query ? `?${query}` : ""}`);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------

export interface GetSignalsOptions {
  page?: number;
  limit?: number;
  keyword?: string;
  platform?: string;
  startDate?: string;
  endDate?: string;
}

export async function getSignals(
  options: GetSignalsOptions = {}
): Promise<PaginatedResponse<Signal> | null> {
  const { page = 1, limit = 20, keyword, platform, startDate, endDate } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (keyword) params.set("keyword", keyword);
  if (platform) params.set("platform", platform);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  try {
    return await apiClient<PaginatedResponse<Signal>>(`/signals?${params.toString()}`);
  } catch {
    return null;
  }
}

export async function getSignalById(
  id: string
): Promise<{ signal: Signal; analysis: SignalAnalysis | { status: string } } | null> {
  try {
    return await apiClient<{ signal: Signal; analysis: SignalAnalysis | { status: string } }>(
      `/signals/${id}`
    );
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export interface GetAlertsOptions {
  page?: number;
  limit?: number;
  status?: string;
  severity?: string;
}

export async function getAlerts(
  options: GetAlertsOptions = {}
): Promise<PaginatedResponse<Alert> | null> {
  const { page = 1, limit = 20, status, severity } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  if (severity) params.set("severity", severity);

  try {
    return await apiClient<PaginatedResponse<Alert>>(`/api/alerts?${params.toString()}`);
  } catch {
    return null;
  }
}

export async function getAlertById(id: string): Promise<Alert | null> {
  try {
    return await apiClient<Alert>(`/api/alerts/${id}`);
  } catch {
    return null;
  }
}

export async function updateAlertStatus(
  id: string,
  status: "open" | "acknowledged" | "resolved"
): Promise<Alert | null> {
  try {
    return await apiClient<Alert>(`/api/alerts/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers — Build page data from backend responses
// ---------------------------------------------------------------------------

/** Map backend Alert[] → page shape used by AlertsPage */
export function buildAlertItems(alerts: Alert[]) {
  const severityTone: Record<string, string> = {
    high: "text-[#F97066]",
    medium: "text-[#FDB022]",
    low: "text-[#D0D5DD]",
  };

  return alerts.map((a) => ({
    id: a.id,
    title: a.title,
    metric: `${a.severity?.toUpperCase() ?? "OPEN"} · ${a.status}`,
    detail: a.whatHappened ?? a.whyItMatters ?? "",
    tone: severityTone[a.severity ?? "low"] ?? "text-[#D0D5DD]",
    status: a.status,
    assignedTo: a.assignedTo ?? null,
    assignedTeam: a.assignedTeam ?? null,
    deadline: a.deadline ?? null,
    escalationLevel: a.escalationLevel ?? "medium",
  }));
}

/** Map backend Signal[] → page shape used by SignalsPage */
export function buildSignalItems(apiSignals: Signal[]) {
  return apiSignals.map((s) => ({
    id: s.id,
    source: s.platform ?? "Unknown",
    sentiment: (s.sentiment ?? "neutral").toLowerCase(),
    excerpt: s.content,
    confidence: null,
    recommendation: "Review signal for action opportunities.",
    narrative: s.title ?? "Unnamed narrative",
    publishedAt: s.publishedAt,
    capturedAt: s.capturedAt,
  }));
}

// ---------------------------------------------------------------------------
// V2 Endpoints (Visibility, Action Plans, Reports, Sources)
// ---------------------------------------------------------------------------

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
  geoActions?: { title: string; tag: string; highlighted?: boolean }[];
}

export async function getVisibility(): Promise<VisibilityResponse | null> {
  try {
    return await apiClient<VisibilityResponse>("/api/visibility");
  } catch {
    return null;
  }
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

export type ActionStrategyType =
  | "pr_response"
  | "content_strategy"
  | "influencer_strategy"
  | "crisis_response";

export interface CreateActionPlanInput {
  workspaceId?: string;
  strategyType: ActionStrategyType;
  alertId?: string;
  clusterId?: string;
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
  createdAt: string;
}

export async function getActionPlans(): Promise<ActionPlanResponse | null> {
  try {
    return await apiClient<ActionPlanResponse>("/api/action-plans");
  } catch {
    return null;
  }
}

export async function createActionPlan(input: CreateActionPlanInput): Promise<CreatedActionPlan | null> {
  try {
    return await apiClient<CreatedActionPlan>("/api/actions", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
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
  options: { page?: number; limit?: number } = {}
): Promise<MetaPaginatedResponse<ActionQueueRecord> | null> {
  const { page = 1, limit = 10 } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });

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
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UpdateWorkspaceSettingsInput {
  brandName?: string | null;
  industry?: string | null;
  timezone?: string | null;
  notificationEmail?: string | null;
  whatsappPIC?: string | null;
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

export async function getCurrentUser(): Promise<CurrentUserResponse | null> {
  try {
    return await apiClient<CurrentUserResponse>("/auth/me");
  } catch {
    return null;
  }
}

export async function getWorkspaceSettings(): Promise<WorkspaceSettingsResponse | null> {
  try {
    return await apiClient<WorkspaceSettingsResponse>("/api/workspace/settings");
  } catch {
    return null;
  }
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

export async function getWorkspaceMembers(): Promise<WorkspaceMemberRecord[] | null> {
  try {
    const response = await apiClient<{ data: WorkspaceMemberRecord[] }>("/api/workspace/members");
    return response.data;
  } catch {
    return null;
  }
}

export async function createWorkspaceMember(input: { userId: string; role: "owner" | "admin" | "analyst" }): Promise<WorkspaceMemberRecord | null> {
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

export interface ReportRecord {
  id: string;
  title: string;
  sections: string;
  readiness: number;
  status: string;
}

export async function getReports(
  options: { page?: number; limit?: number } = {}
): Promise<PaginatedResponse<ReportRecord> | null> {
  const { page = 1, limit = 10 } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });

  try {
    return await apiClient<PaginatedResponse<ReportRecord>>(`/api/reports?${params.toString()}`);
  } catch {
    return null;
  }
}

export interface NarrativeRecord {
  id: string;
  title: string;
  description: string;
  sourceCount: number;
  confidence: number;
  impact: string;
  velocity: string;
  recommendedFocus: string;
  signalCount: number;
  sentiment: string;
}

export async function getNarratives(
  options: { page?: number; limit?: number; sentiment?: string; impact?: string } = {}
): Promise<PaginatedResponse<NarrativeRecord> | null> {
  const { page = 1, limit = 10, sentiment, impact } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sentiment) params.set("sentiment", sentiment);
  if (impact) params.set("impact", impact);

  try {
    return await apiClient<PaginatedResponse<NarrativeRecord>>(`/api/narratives?${params.toString()}`);
  } catch {
    return null;
  }
}

export interface SourceRecord {
  id: string;
  workspaceId?: string;
  name: string;
  type: string;
  actorId?: string | null;
  inputConfig?: unknown;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  health?: string;
  coverage?: string;
  latency?: string;
}

export async function getSources(
  options: { page?: number; limit?: number; type?: string; isActive?: boolean; search?: string } = {}
): Promise<PaginatedResponse<SourceRecord> | null> {
  const { page = 1, limit = 50, type, isActive, search } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (type) params.set("type", type);
  if (isActive !== undefined) params.set("isActive", String(isActive));
  if (search) params.set("search", search);

  try {
    return await apiClient<PaginatedResponse<SourceRecord>>(`/sources?${params.toString()}`);
  } catch {
    return null;
  }
}

export interface CreateSourceInput {
  name: string;
  type: string;
  actorId?: string;
  inputConfig?: Record<string, unknown>;
}

export interface UpdateSourceInput {
  name?: string;
  type?: string;
  actorId?: string | null;
  inputConfig?: Record<string, unknown>;
  isActive?: boolean;
}

export async function createSource(input: CreateSourceInput): Promise<SourceRecord | null> {
  try {
    return await apiClient<SourceRecord>("/sources", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function updateSource(sourceId: string, input: UpdateSourceInput): Promise<SourceRecord | null> {
  try {
    return await apiClient<SourceRecord>(`/sources/${sourceId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function deleteSource(sourceId: string): Promise<SourceRecord | null> {
  try {
    return await apiClient<SourceRecord>(`/sources/${sourceId}`, {
      method: "DELETE",
    });
  } catch {
    return null;
  }
}

export async function runSourceIngestion(sourceId: string): Promise<{ message: string; jobId: string } | null> {
  try {
    return await apiClient<{ message: string; jobId: string }>(`/ingestion/run/${sourceId}`, {
      method: "POST",
    });
  } catch {
    return null;
  }
}

export async function getIngestionStatus(jobId: string): Promise<{ status: string; errorMessage?: string | null } | null> {
  try {
    return await apiClient<{ status: string; errorMessage?: string | null }>(`/ingestion/status/${jobId}`);
  } catch {
    return null;
  }
}

export async function submitActionPlanFeedback(
  actionPlanId: string,
  action: "accepted" | "edited" | "rejected",
  reason?: string
): Promise<{ id: string; action: string } | null> {
  try {
    return await apiClient<{ id: string; action: string }>(`/api/action-plans/${actionPlanId}/feedback`, {
      method: "POST",
      body: JSON.stringify({ action, reason }),
    });
  } catch {
    return null;
  }
}

export async function logoutSession(refreshToken: string): Promise<boolean> {
  try {
    await apiClient<{ success: boolean }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function createReportExport(reportId: string, format: "json" | "pdf" = "json"): Promise<{ message: string; jobId: string } | null> {
  try {
    return await apiClient<{ message: string; jobId: string }>(`/api/reports/${reportId}/export`, {
      method: "POST",
      body: JSON.stringify({ format }),
    });
  } catch {
    return null;
  }
}

export async function getReportExportStatus(jobId: string): Promise<{ jobId: string; reportId: string; format: string; status: string; errorMessage?: string | null; signedUrl?: string | null } | null> {
  try {
    return await apiClient<{ jobId: string; reportId: string; format: string; status: string; errorMessage?: string | null; signedUrl?: string | null }>(`/api/reports/exports/${jobId}`);
  } catch {
    return null;
  }
}

export async function downloadReportExport(signedUrl: string): Promise<unknown | null> {
  try {
    const url = new URL(signedUrl);
    return await apiClient<unknown>(`${url.pathname}${url.search}`);
  } catch {
    return null;
  }
}
