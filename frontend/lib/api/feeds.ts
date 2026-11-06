/** Dashboard, signals, alerts and escalation matrix, plus the page-data builders. Re-exported from @/lib/api-service. */

import type { LucideIcon } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/store/useAuthStore";
import { getMockAlerts, getMockDashboardSummary, isDemoMode } from "../demo-mock-data";
import { Alert, DashboardSummary, DateRangeOptions, PaginatedResponse, Signal, SignalAnalysis } from "./core";

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getDashboardSummary(options: DateRangeOptions = {}): Promise<DashboardSummary | null> {
  const params = new URLSearchParams();
  if (options.startDate) params.set("startDate", options.startDate);
  if (options.endDate) params.set("endDate", options.endDate);
  const query = params.toString();

  try {
    const res = await apiClient<DashboardSummary>(`/api/dashboard/summary${query ? `?${query}` : ""}`);
    if (res) return res;
  } catch (err) {
    console.warn("[api-service] getDashboardSummary failed, falling back:", err);
  }

  // Fallback to mock data if API fails and in demo mode
  if (isDemoMode()) {
    return getMockDashboardSummary();
  }
  return null;
}

/**
 * Live dashboard summary without any fallback: errors propagate (with the
 * HTTP `status` attached by apiClient) so the UI can tell an expired session,
 * a forbidden workspace and a server failure apart from genuinely empty data.
 */
export async function fetchDashboardSummaryStrict(options: DateRangeOptions = {}): Promise<DashboardSummary> {
  const params = new URLSearchParams();
  if (options.startDate) params.set("startDate", options.startDate);
  if (options.endDate) params.set("endDate", options.endDate);
  const query = params.toString();
  return apiClient<DashboardSummary>(`/api/dashboard/summary${query ? `?${query}` : ""}`);
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
  sentiment?: string;
  /** Records linked to this narrative (same workspace only). */
  narrativeId?: string;
  /** "direct": names the brand; "other": does not. */
  relevance?: "direct" | "other";
  /** "analyzed" or "pending" AI analysis. */
  analysis?: "analyzed" | "pending";
}

export interface SignalsMeta {
  totalSignals: number;
  followUps: Array<{ title: string; badge: string; meta: string; time: string; tone: string }>;
  recommendations: Array<{ title: string; desc: string; badge: string; tone: string; icon?: LucideIcon }>;
  sourceDistribution: Array<{ name: string; value: string; color: string }>;
  timeline: number[];
  timelineLabels?: string[];
  investigationQueue: Array<{ title: string; meta: string; badge: string; tone: string }>;
  metrics?: {
    totalSignals24h: number;
    negativeSignals24h: number;
    positiveSignals24h?: number;
    criticalSignals24h: number;
  };
  aiSummary?: {
    title: string;
    content: { en: string; id: string };
    insight: { en: string; id: string };
  } | null;
}

export async function getSignalsMeta(): Promise<SignalsMeta | null> {
  try {
    return await apiClient<SignalsMeta>("/signals/meta");
  } catch {
    return null;
  }
}

/** A page of signals plus how brand relevance was determined for this workspace. */
export type SignalListPage = PaginatedResponse<Signal> & { relevance?: { configured: boolean; brand: string | null; brandSource: string } | null };

export async function getSignals(
  options: GetSignalsOptions = {}
): Promise<SignalListPage | null> {
  const { page = 1, limit = 20, keyword, platform, startDate, endDate, sentiment, narrativeId, relevance, analysis } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (keyword) params.set("keyword", keyword);
  if (platform) params.set("platform", platform);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (sentiment) params.set("sentiment", sentiment);
  if (narrativeId) params.set("narrativeId", narrativeId);
  if (relevance) params.set("relevance", relevance);
  if (analysis) params.set("analysis", analysis);

  try {
    return await apiClient<SignalListPage>(`/signals?${params.toString()}`);
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

export async function downloadSignalsExport(
  format: "csv" | "xlsx",
  filters: { keyword?: string; platform?: string; sentiment?: string; startDate?: string; endDate?: string } = {}
): Promise<void> {
  const token = typeof window !== "undefined" ? useAuthStore.getState().token : null;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000";
  const params = new URLSearchParams();
  params.set("format", format);
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.platform) params.set("platform", filters.platform);
  if (filters.sentiment) params.set("sentiment", filters.sentiment);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);

  const res = await fetch(`${baseUrl}/signals/export?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) throw new Error("Failed to export signals");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `narriv-signals-${new Date().toISOString().split("T")[0]}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export interface GetAlertsOptions {
  page?: number;
  limit?: number;
  status?: string;
  severity?: string;
  search?: string;
  /** risk, opportunity or positioning. */
  type?: string;
}

/** One alert in the frontend shape; the API answers in snake_case (list) or camelCase (detail). */
 
function normalizeAlert(raw: any): Alert {
  return {
    // Keep any extra fields the API sends (links, metadata); the mapped ones below win.
    ...raw,
    id: raw.id,
    title: raw.title,
    evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
    evidenceMissing: typeof raw.evidenceMissing === "number" ? raw.evidenceMissing : 0,
    triggeredBy: raw.triggeredBy ?? null,
    whatHappened: raw.whatHappened ?? raw.what_happened ?? raw.description ?? null,
    whyItMatters: raw.whyItMatters ?? raw.why_it_matters ?? null,
    whatToDo: raw.whatToDo ?? raw.what_to_do ?? null,
    severity: raw.severity ?? null,
    status: raw.status ?? "open",
    type: raw.type ?? null,
    assignedTo: raw.assignedTo ?? raw.assigned_to ?? null,
    assignedTeam: raw.assignedTeam ?? raw.assigned_team ?? null,
    deadline: raw.deadline ?? null,
    escalationLevel: raw.escalationLevel ?? raw.escalation_level ?? null,
    workflowStatus: raw.workflowStatus ?? raw.workflow_status ?? null,
    sources: raw.sources ?? (raw.source ? [raw.source] : []),
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
  };
}

export async function getAlerts(
  options: GetAlertsOptions = {}
): Promise<PaginatedResponse<Alert> | null> {
  const { page = 1, limit = 20, status, severity, search, type } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (type) params.set("type", type);
  if (status) params.set("status", status);
  if (severity) params.set("severity", severity);
  if (search) params.set("search", search);

  try {
    const res = await apiClient<PaginatedResponse<Alert>>(`/api/alerts?${params.toString()}`);
    return res ? { ...res, data: (res.data ?? []).map(normalizeAlert) } : res;
  } catch {
    return null;
  }
}

export async function getAlertById(id: string): Promise<Alert | null> {
  // If id is a mock ID or starts with demo-alert-, look up in mock alerts
  if (isDemoMode() && (id.startsWith("demo-alert-") || id.startsWith("mock-alert-"))) {
    const mockAlerts = getMockAlerts();
    const found = mockAlerts.find((a) => a.id === id);
    if (found) return found;
  }

  try {
    const raw = await apiClient<any>(`/api/alerts/${id}`);
    if (!raw) return null;

    return normalizeAlert(raw);
  } catch {
    // Never another alert in place of the one requested.
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

export interface CreateAlertInput {
  title: string;
  type?: "risk" | "opportunity" | "positioning";
  severity?: "low" | "medium" | "high" | "critical";
  whatHappened?: string;
  whyItMatters?: string;
  whatToDo?: string;
  assignedTo?: string;
  assignedTeam?: string;
  deadline?: string;
  sources?: string[];
  workspaceId?: string;
}

export async function createAlert(input: CreateAlertInput): Promise<Alert | null> {
  return apiClient<Alert>("/api/alerts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ---------------------------------------------------------------------------
// Escalation Matrix
// ---------------------------------------------------------------------------

export interface EscalationMatrixRecord {
  id: string;
  workspaceId: string;
  level: string;
  roleName: string;
  slaMinutes: number;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type NotificationRuleTrigger = "severity" | "sentiment" | "sla" | "keyword";

export interface NotificationRuleRecord {
  id: string;
  trigger: NotificationRuleTrigger;
  condition: string;
  channels: string[];
  enabled: boolean;
}

export async function getEscalationMatrix(): Promise<EscalationMatrixRecord[] | null> {
  try {
    const response = await apiClient<{ data: EscalationMatrixRecord[] }>("/api/alerts/escalation-matrix");
    return response.data;
  } catch {
    return null;
  }
}

export async function updateEscalationMatrix(levels: Array<{ level: string; roleName: string; slaMinutes: number; isActive?: boolean; order: number }>): Promise<EscalationMatrixRecord[] | null> {
  try {
    const response = await apiClient<{ data: EscalationMatrixRecord[] }>("/api/alerts/escalation-matrix", {
      method: "POST",
      body: JSON.stringify({ levels }),
    });
    return response.data;
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

export type CorrectableSentiment = "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";

/**
 * A person's correction of the AI's sentiment for one record: updates the record (so counts change at once) and
 * logs it as AI feedback, which feeds the accuracy numbers.
 */
export async function correctSignalSentiment({ signalId, workspaceId, from, to }: { signalId: string; workspaceId: string | null; from: string | null; to: CorrectableSentiment }) {
  await apiClient(`/api/signals/${signalId}`, { method: "PATCH", body: JSON.stringify({ sentiment: to }) });
  if (workspaceId) {
    await apiClient("/api/feedback", {
      method: "POST",
      body: JSON.stringify({ workspaceId, targetType: "signal_sentiment", targetId: signalId, action: "edited", originalOutput: { sentiment: from }, editedOutput: { sentiment: to } }),
    }).catch(() => null);
  }
}
