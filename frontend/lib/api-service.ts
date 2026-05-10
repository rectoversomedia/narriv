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

export interface PaginatedResponse<T> {
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
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getDashboardSummary(): Promise<DashboardSummary | null> {
  try {
    return await apiClient<DashboardSummary>("/api/dashboard/summary");
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
}

export async function getSignals(
  options: GetSignalsOptions = {}
): Promise<PaginatedResponse<Signal> | null> {
  const { page = 1, limit = 20, keyword, platform } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (keyword) params.set("keyword", keyword);
  if (platform) params.set("platform", platform);

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

export interface ActionPlanResponse {
  id?: string;
  inputNarrative?: string;
  evidenceSummary?: string;
  outputs?: [string, string][];
  plan?: [string, string][];
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

export async function getActionQueue(
  options: { page?: number; limit?: number } = {}
): Promise<PaginatedResponse<ActionQueueRecord> | null> {
  const { page = 1, limit = 10 } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });

  try {
    return await apiClient<PaginatedResponse<ActionQueueRecord>>(`/api/actions?${params.toString()}`);
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

export async function getCurrentUser(): Promise<CurrentUserResponse | null> {
  try {
    return await apiClient<CurrentUserResponse>("/auth/me");
  } catch {
    return null;
  }
}

export interface ReportRecord {
  id?: string;
  title: string;
  sections: string;
  readiness: number;
  status: string;
}

export async function getReports(): Promise<{ reports: ReportRecord[] } | null> {
  try {
    return await apiClient<{ reports: ReportRecord[] }>("/api/reports");
  } catch {
    return null;
  }
}

export async function getNarratives(): Promise<unknown | null> {
  try {
    return await apiClient<unknown>("/api/narratives");
  } catch {
    return null;
  }
}

export async function getSources(): Promise<unknown | null> {
  try {
    return await apiClient<unknown>("/sources");
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
  health?: string;
  coverage?: string;
  latency?: string;
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
