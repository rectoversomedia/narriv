/** Notifications, visibility, alert summary, bulk operations and search. Re-exported from @/lib/api-service. */

import { apiClient } from "@/lib/apiClient";
import { type AuthUser } from "@/store/useAuthStore";
import { getMockNarrativeDetail, isDemoMode } from "../demo-mock-data";
import { Alert, PaginationInfo, Signal } from "./core";
import { VisibilityResponse } from "./workspace";
import { NarrativeDetailRecord } from "./reports";

// Notifications API
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  data: AppNotification[];
  meta: {
    page: number;
    limit: number;
    total: number;
    unreadCount: number;
    totalPages: number;
  };
}

export async function getNotifications(page = 1, limit = 20): Promise<NotificationsResponse | null> {
  try {
    return await apiClient<NotificationsResponse>(`/api/notifications?page=${page}&limit=${limit}`);
  } catch {
    return null;
  }
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    const res = await apiClient<{ success: boolean }>(`/api/notifications/${id}/read`, { method: "PATCH" });
    return res.success;
  } catch {
    return false;
  }
}

export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    const res = await apiClient<{ success: boolean }>("/api/notifications/read-all", { method: "PATCH" });
    return res.success;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

export interface VisibilitySummaryResponse {
  /** Per test prompt, each engine's latest answer: brand named or not, and which competitors it named. */
  prompt_matrix?: Array<{ prompt: string; engines: Record<string, { mentioned: boolean; tone: string; competitors: string[] }> }>;
  competitor_mentions?: Array<{ name: string; count: number }>;
  answer_totals?: { answers: number; brand_answers: number };
  brand_name?: string | null;
  kpis: {
    avg_visibility_score: number;
    avg_brand_presence_rate: number;
    avg_competitor_mention_rate: number;
    engines_tracked: number;
    total_analyses: number;
  };
  engine_breakdown: Array<{
    engineName: string;
    /** chatgpt | gemini | claude | perplexity | deepseek, or null for an engine outside the five. */
    engineKey?: string | null;
    visibilityScore: number;
    brandPresenceRate: number;
    competitorMentionRate: number;
    lastChecked: string;
    metadata: Record<string, unknown>;
  }>;
  engines?: GeoEngineStatus[];
}

/** The five AI assistants checked for GEO and whether each has an API key on the server. */
export interface GeoEngineStatus {
  key: string;
  name: string;
  model: string;
  configured: boolean;
}

/** Ask every connected AI assistant the workspace's test prompts (owners and admins). */
export async function runGeoAllEngines(): Promise<{ results: Array<{ engine: string; ok: boolean; score?: number | null; error?: string }> }> {
  return apiClient("/api/visibility/analyze-all", { method: "POST", body: JSON.stringify({}) });
}

export interface VisibilityTrendsResponse {
  period: {
    from: string;
    to: string;
    days: number;
  };
  trends: Array<{
    date: string;
    avg_visibility_score: number;
    avg_brand_presence_rate: number;
    avg_competitor_mention_rate: number;
    data_points: number;
  }>;
  engine_trends: Record<string, Array<{
    date: string;
    visibilityScore: number;
    brandPresenceRate: number;
    competitorMentionRate: number;
  }>>;
}

export async function getVisibility(workspaceId?: string): Promise<VisibilityResponse | null> {
  try {
    const qs = workspaceId ? `?workspaceId=${workspaceId}` : "";
    return await apiClient<VisibilityResponse>(`/api/visibility${qs}`);
  } catch {
    return null;
  }
}

export async function getVisibilitySummary(workspaceId?: string): Promise<VisibilitySummaryResponse | null> {
  try {
    const qs = workspaceId ? `?workspaceId=${workspaceId}` : "";
    return await apiClient<VisibilitySummaryResponse>(`/api/visibility/summary${qs}`);
  } catch {
    return null;
  }
}

export async function getVisibilityTrends(workspaceId?: string, engineName?: string, days?: number): Promise<VisibilityTrendsResponse | null> {
  try {
    const params = new URLSearchParams();
    if (workspaceId) params.set("workspaceId", workspaceId);
    if (engineName) params.set("engineName", engineName);
    if (days) params.set("days", String(days));
    const qs = params.toString();
    return await apiClient<VisibilityTrendsResponse>(`/api/visibility/trends${qs ? `?${qs}` : ""}`);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Alerts Summary
// ---------------------------------------------------------------------------

export interface AlertsSummaryResponse {
  total: number;
  by_severity: { critical: number; high: number; medium: number; low: number; info: number };
  by_status: { open: number; in_progress: number; resolved: number };
  by_type: Record<string, number>;
  last_7_days: number;
  previous_7_days: number;
  trend_delta: number;
  timeline: number[];
  timeline_labels: string[];
  acknowledged_count?: number;
  resolved_count?: number;
  escalated_count?: number;
  overdue_count?: number;
  avg_response_time_minutes: number | null;
  delivery_success_rate: number;
  acknowledgment_rate?: number;
  sla_target_minutes?: number | null;
}

// ---------------------------------------------------------------------------
// Recovered Missing Endpoints
// ---------------------------------------------------------------------------

export async function exchangeOAuthCode(code: string): Promise<{ token: string; user: AuthUser; refreshToken: string; workspace?: { id: string; name: string; slug: string; onboarding_completed: boolean } }> {
  console.log("[exchangeOAuthCode] Starting exchange for code:", code.substring(0, 10) + "...");
  let raw: Record<string, unknown> | null = null;
  try {
    // Call the frontend proxy route (not backend) so the frontend can set the auth cookie
    // on narriv.digital domain where the middleware runs.
    const response = await fetch("/api/auth/oauth/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Exchange failed: ${response.status}`);
    }
    raw = await response.json() as Record<string, unknown>;
    console.log("[exchangeOAuthCode] Response keys:", raw ? Object.keys(raw) : "null", "has token:", !!raw?.token, "has user:", !!raw?.user);
  } catch (err) {
    console.error("[exchangeOAuthCode] API call failed:", err);
    throw err;
  }
  if (!raw) throw new Error("Empty response from exchange endpoint");
  return {
    token: String(raw.token || ""),
    user: raw.user as AuthUser,
    refreshToken: String(raw.refreshToken || raw.refresh_token || ""),
    workspace: raw.workspace as { id: string; name: string; slug: string; onboarding_completed: boolean } | undefined,
  };
}

export interface FeedbackAccuracyResponse {
  accuracy_score: number;
  acceptance_rate: number;
  rejection_rate: number;
  by_type: Record<string, { total: number; accuracy: number }>;
}

export async function getFeedbackAccuracy(options: Record<string, string | number | boolean> = {}): Promise<FeedbackAccuracyResponse | null> {
  try {
    const params = new URLSearchParams(options as Record<string, string>);
    return await apiClient<FeedbackAccuracyResponse>(`/api/feedback/accuracy?${params.toString()}`);
  } catch {
    return null;
  }
}

export async function getNarrativeById(id: string): Promise<NarrativeDetailRecord | null> {
  if (isDemoMode() && (id.startsWith("demo-narrative-") || id.startsWith("mock-narrative-"))) {
    return getMockNarrativeDetail(id);
  }

  // A real narrative id never falls back to sample content.
  try {
    return (await apiClient<NarrativeDetailRecord>(`/api/narratives/${id}`)) ?? null;
  } catch {
    return null;
  }
}

export interface ReportsAnalyticsResponse {
  format_distribution: {
    pdf: number;
    json: number;
  };
  popular_templates: Array<{
    name: string;
    count: number;
  }>;
  trend_timeline: Array<{
    date: string;
    count: number;
  }>;
}

export async function getReportsAnalytics(options: Record<string, string | number | boolean> = {}): Promise<ReportsAnalyticsResponse | null> {
  try {
    const params = new URLSearchParams(options as Record<string, string>);
    return await apiClient<ReportsAnalyticsResponse>(`/api/reports/analytics?${params.toString()}`);
  } catch {
    return null;
  }
}

export interface BatchIngestionResponse {
  total: number;
  queued: number;
  failed: number;
  failures: string[];
}

export async function runBatchSourceIngestion(sourceIds: string[]): Promise<BatchIngestionResponse | null> {
  try {
    const batches = Array.from({ length: Math.ceil(sourceIds.length / 25) }, (_, index) => sourceIds.slice(index * 25, index * 25 + 25));
    const summaries = await Promise.all(batches.map((batch) => apiClient<BatchIngestionResponse>("/ingestion/run", {
      method: "POST",
      body: JSON.stringify({ sourceIds: batch })
    })));

    return summaries.reduce<BatchIngestionResponse>((acc, summary) => ({
      total: acc.total + summary.total,
      queued: acc.queued + summary.queued,
      failed: acc.failed + summary.failed,
      failures: [...acc.failures, ...summary.failures],
    }), { total: 0, queued: 0, failed: 0, failures: [] });
  } catch {
    return null;
  }
}

export interface GetAlertsSummaryOptions {
  workspaceId?: string;
}

export async function getAlertsSummary(options: GetAlertsSummaryOptions = {}): Promise<AlertsSummaryResponse | null> {
  const params = new URLSearchParams();
  if (options.workspaceId) params.set("workspaceId", options.workspaceId);
  const qs = params.toString();

  try {
    return await apiClient<AlertsSummaryResponse>(`/api/alerts/summary${qs ? `?${qs}` : ""}`);
  } catch {
    return null;
  }
}

export interface BootstrapSourcesResponse {
  created: number;
  skipped: number;
}

export async function bootstrapDefaultSources(options: Record<string, unknown> = {}): Promise<BootstrapSourcesResponse | null> {
  try {
    return await apiClient<BootstrapSourcesResponse>("/sources/bootstrap-defaults", {
      method: "POST",
      body: JSON.stringify(options)
    });
  } catch {
    return null;
  }
}

export interface ActionPlanMetric {
  value: string | number;
  /** % change vs the previous 7 days; null when there is no earlier period. */
  trend: number | null;
}

export interface ActionPlanMetricsResponse {
  active: ActionPlanMetric;
  inProgress: ActionPlanMetric;
  done: ActionPlanMetric;
  needsAttention: ActionPlanMetric;
  resolution: ActionPlanMetric;
}

export async function getActionPlansMetrics(): Promise<ActionPlanMetricsResponse | null> {
  try {
    return await apiClient<ActionPlanMetricsResponse>("/api/action-plans/metrics");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Bulk Operations
// ---------------------------------------------------------------------------

export interface BulkDeleteSignalsResponse {
  deleted: number;
  requested: number;
}

export interface BulkUpdateSignalsResponse {
  updated: number;
  requested: number;
}

export interface BulkAnalyzeSignalsResponse {
  queued: number;
  skipped: number;
  total: number;
}

export interface BulkCreateAlertsResponse {
  created: number;
  alerts: Alert[];
}

export interface BulkUpdateAlertsResponse {
  updated: number;
  requested: number;
}

export interface BulkAssignAlertsResponse {
  assigned: number;
}

export async function bulkDeleteSignals(signalIds: string[]): Promise<BulkDeleteSignalsResponse | null> {
  try {
    return await apiClient<BulkDeleteSignalsResponse>("/api/bulk/signals/delete", {
      method: "POST",
      body: JSON.stringify({ signalIds }),
    });
  } catch {
    return null;
  }
}

export async function bulkUpdateSignals(signalIds: string[], updates: Record<string, unknown>): Promise<BulkUpdateSignalsResponse | null> {
  try {
    return await apiClient<BulkUpdateSignalsResponse>("/api/bulk/signals", {
      method: "PATCH",
      body: JSON.stringify({ signalIds, updates }),
    });
  } catch {
    return null;
  }
}

export async function bulkAnalyzeSignals(signalIds: string[], options?: { maxConcurrent?: number; skipAnalyzed?: boolean }): Promise<BulkAnalyzeSignalsResponse | null> {
  try {
    return await apiClient<BulkAnalyzeSignalsResponse>("/api/bulk/signals/analyze", {
      method: "POST",
      body: JSON.stringify({ signalIds, options }),
    });
  } catch {
    return null;
  }
}

export async function bulkCreateAlertsFromSignals(signalIds: string[], alertData?: { severity?: string }): Promise<BulkCreateAlertsResponse | null> {
  try {
    return await apiClient<BulkCreateAlertsResponse>("/api/bulk/signals/create-alerts", {
      method: "POST",
      body: JSON.stringify({ signalIds, alertData }),
    });
  } catch {
    return null;
  }
}

export async function bulkUpdateAlerts(alertIds: string[], updates: Record<string, unknown>): Promise<BulkUpdateAlertsResponse | null> {
  try {
    return await apiClient<BulkUpdateAlertsResponse>("/api/bulk/alerts", {
      method: "PATCH",
      body: JSON.stringify({ alertIds, updates }),
    });
  } catch {
    return null;
  }
}

export async function bulkAssignAlerts(alertIds: string[], assignment: { assigned_to?: string; assigned_team?: string; deadline?: string }): Promise<BulkAssignAlertsResponse | null> {
  try {
    return await apiClient<BulkAssignAlertsResponse>("/api/bulk/alerts/assign", {
      method: "POST",
      body: JSON.stringify({ alertIds, assignment }),
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Advanced Search
// ---------------------------------------------------------------------------

export interface AdvancedSearchFilters {
  platform?: string;
  sentiment?: string;
  severity?: string;
  dateFrom?: string;
  dateTo?: string;
  sourceId?: string;
  topics?: string[];
  language?: string;
  status?: string;
  type?: string;
  assignedTo?: string;
  escalationLevel?: string;
  priority?: string;
  narrativeTypes?: string[];
}

export interface SearchSignalsResponse {
  data: Array<Signal & { relevance_score?: number }>;
  pagination: PaginationInfo;
  meta: {
    query?: string;
    filters: AdvancedSearchFilters;
    sort: string;
  };
}

export interface SearchAlertsResponse {
  data: Alert[];
  pagination: PaginationInfo;
}

export interface GlobalSearchResponse {
  signals: Array<{ id: string; title: string; platform: string; sentiment: string; captured_at: string }>;
  alerts: Array<{ id: string; title: string; severity: string; status: string; created_at: string }>;
  actionPlans: Array<{ id: string; title: string; status: string; priority: string; created_at: string }>;
  meta: { query: string };
}

export interface SearchSuggestionsResponse {
  suggestions: Array<{
    type: "platform" | "topic" | "signal";
    value: string;
    id?: string;
  }>;
}

export interface SearchFacetsResponse {
  platforms: Array<{ value: string; count: number }>;
  sentiments: Array<{ value: string; count: number }>;
  severities: Array<{ value: string; count: number }>;
  languages: Array<{ value: string; count: number }>;
}

export async function searchSignals(options: {
  query?: string;
  filters?: AdvancedSearchFilters;
  page?: number;
  limit?: number;
  sort?: "relevance" | "recent" | "oldest" | "sentiment_score";
}): Promise<SearchSignalsResponse | null> {
  const { query, filters = {}, page = 1, limit = 20, sort = "relevance" } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit), sort });
  if (query) params.set("query", query);
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        params.set(key, value.join(","));
      } else {
        params.set(key, String(value));
      }
    }
  });

  try {
    return await apiClient<SearchSignalsResponse>(`/api/search/signals?${params.toString()}`);
  } catch {
    return null;
  }
}

export async function searchAlerts(options: {
  query?: string;
  filters?: AdvancedSearchFilters;
  page?: number;
  limit?: number;
  sort?: "recent" | "severity" | "deadline";
}): Promise<SearchAlertsResponse | null> {
  const { query, filters = {}, page = 1, limit = 20, sort = "recent" } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit), sort });
  if (query) params.set("query", query);
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        params.set(key, value.join(","));
      } else {
        params.set(key, String(value));
      }
    }
  });

  try {
    return await apiClient<SearchAlertsResponse>(`/api/search/alerts?${params.toString()}`);
  } catch {
    return null;
  }
}

export async function globalSearch(query: string, limit = 5): Promise<GlobalSearchResponse | null> {
  try {
    return await apiClient<GlobalSearchResponse>(`/api/search/global?q=${encodeURIComponent(query)}&limit=${limit}`);
  } catch {
    return null;
  }
}

export async function getSearchSuggestions(partial: string, type = "all"): Promise<SearchSuggestionsResponse | null> {
  try {
    return await apiClient<SearchSuggestionsResponse>(`/api/search/suggestions?q=${encodeURIComponent(partial)}&type=${type}`);
  } catch {
    return null;
  }
}

export async function getSearchFacets(dateRange = "30d"): Promise<SearchFacetsResponse | null> {
  try {
    return await apiClient<SearchFacetsResponse>(`/api/search/facets?dateRange=${dateRange}`);
  } catch {
    return null;
  }
}
