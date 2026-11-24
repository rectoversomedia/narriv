/** Report templates, schedules, reports, narratives and sources. Re-exported from @/lib/api-service. */

import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";
import { PaginatedResponse } from "./core";

// ---------------------------------------------------------------------------
// Report Templates & Generation
// ---------------------------------------------------------------------------

export interface ReportTemplate {
  key: string;
  name: string;
  description: string;
  format: string;
  cadence: string;
  sectionCount: number;
  isSystem?: boolean;
}

export async function getReportTemplates(): Promise<{ data: ReportTemplate[] } | null> {
  try {
    return await apiClient<{ data: ReportTemplate[] }>("/api/reports/templates");
  } catch {
    return null;
  }
}

export async function createReportTemplate(input: Partial<ReportTemplate>): Promise<ReportTemplate> {
  return await apiClient<ReportTemplate>("/api/reports/templates", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateReportTemplate(id: string, input: Partial<ReportTemplate>): Promise<ReportTemplate> {
  return await apiClient<ReportTemplate>(`/api/reports/templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteReportTemplate(id: string): Promise<boolean> {
  await apiClient<{ success: boolean }>(`/api/reports/templates/${id}`, { method: "DELETE" });
  return true;
}

// ---------------------------------------------------------------------------
// Report Schedules
// ---------------------------------------------------------------------------

export interface ReportScheduleRecord {
  id: string;
  workspaceId: string;
  templateKey: string;
  name: string;
  cadence: string;
  dayOfWeek: string | null;
  timeOfDay: string;
  timezone: string;
  recipients: string[];
  ccRecipients?: string[];
  bccRecipients?: string[];
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getReportSchedules(): Promise<{ data: ReportScheduleRecord[] } | null> {
  try {
    return await apiClient<{ data: ReportScheduleRecord[] }>("/api/reports/schedules");
  } catch {
    return null;
  }
}

export async function createReportSchedule(input: Partial<ReportScheduleRecord>): Promise<ReportScheduleRecord> {
  return await apiClient<ReportScheduleRecord>("/api/reports/schedules", {
    method: "POST",
    body: JSON.stringify({
      templateKey: input.templateKey,
      name: input.name,
      cadence: input.cadence,
      dayOfWeek: input.dayOfWeek,
      timeOfDay: input.timeOfDay,
      timezone: input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      recipients: input.recipients || [],
      ccRecipients: input.ccRecipients || [],
      bccRecipients: input.bccRecipients || [],
      enabled: input.enabled ?? true,
    }),
  });
}

export async function updateReportSchedule(id: string, input: Partial<ReportScheduleRecord>): Promise<ReportScheduleRecord> {
  return await apiClient<ReportScheduleRecord>(`/api/reports/schedules/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      templateKey: input.templateKey,
      name: input.name,
      cadence: input.cadence,
      dayOfWeek: input.dayOfWeek,
      timeOfDay: input.timeOfDay,
      timezone: input.timezone,
      recipients: input.recipients,
      ccRecipients: input.ccRecipients,
      bccRecipients: input.bccRecipients,
      enabled: input.enabled,
    }),
  });
}

export async function deleteReportSchedule(id: string): Promise<boolean> {
  await apiClient<{ success: boolean }>(`/api/reports/schedules/${id}`, { method: "DELETE" });
  return true;
}

export async function toggleReportSchedule(id: string): Promise<ReportScheduleRecord> {
  return await apiClient<ReportScheduleRecord>(`/api/reports/schedules/${id}/toggle`, { method: "PATCH" });
}

export interface SendTestEmailResponse {
  success: boolean;
  message: string;
  recipients?: string[];
}

export async function sendTestScheduleEmail(scheduleId: string): Promise<SendTestEmailResponse> {
  try {
    return await apiClient<SendTestEmailResponse>(`/api/reports/schedules/${scheduleId}/test-email`, {
      method: "POST",
    });
  } catch (error) {
    return { success: false, message: error instanceof Error && error.message ? error.message : "Failed to send test email" };
  }
}

export interface GeneratedReportResponse {
  id: string;
  title: string;
  template: string;
  sections: Array<{ id: string; title: string; data: unknown }>;
  createdAt: string;
}

export async function generateReportFromTemplate(input: { templateKey: string; dateRange?: { start: string; end: string }; language?: "en" | "id" }): Promise<GeneratedReportResponse> {
  return await apiClient<GeneratedReportResponse>("/api/reports/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function sendReportEmail(input: { reportId: string; recipientEmail: string; subject?: string; body?: string }): Promise<{ sent: boolean; to?: string; reason?: string }> {
  return await apiClient(`/api/reports/${input.reportId}/send-email`, {
    method: "POST",
    body: JSON.stringify({ recipientEmail: input.recipientEmail, subject: input.subject, body: input.body }),
  });
}

export interface ReportRecord {
  id: string;
  title: string;
  /** "5 bagian" when the report has stored sections, otherwise null. */
  sections: string | null;
  status: string;
  summary?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  type?: string;
  createdAt?: string;
}

export interface ReportDetailSection {
  id?: string;
  title: string;
  data?: unknown;
  content?: unknown;
  summary?: string;
}

export interface ReportDetailRecord {
  id: string;
  title: string;
  template?: string;
  createdAt?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  sections?: ReportDetailSection[];
  summary?: string;
  recommendations?: unknown;
  keyFindings?: unknown;
  [key: string]: unknown;
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

export async function getReportById(id: string): Promise<ReportDetailRecord | null> {
  try {
    return await apiClient<ReportDetailRecord>(`/api/reports/${id}`);
  } catch {
    return null;
  }
}

/** The report exactly as the downloaded PDF shows it (from /api/reports/:id/view). */
export interface ReportView {
  id: string;
  title: string;
  brand: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string | null;
  totals: { signals: number; analyzed: number; positive: number; negative: number; neutral: number; mixed: number; alerts: number; criticalAlerts: number };
  platforms: Array<{ platform: string; count: number }>;
  alerts: Array<{ title: string; severity: string; status: string; whatHappened: string; whatToDo: string; createdAt: string | null }>;
  issues: Array<{ title: string; signals: number; sentiment: string; impact: string }>;
  signals: Array<{ title: string; platform: string; sentiment: string; capturedAt: string | null; publishedAt?: string | null; url: string | null }>;
  freshness?: ReportFreshness | null;
}

/** When the data behind a report was last updated, the delay per platform, and records that arrived later. */
export interface ReportFreshness {
  dataAsOf: string | null;
  latency: Array<{ platform: string; medianHours: number | null; p90Hours: number | null; sample: number }>;
  lateArrivals: number | null;
  basis: "published_at";
}

export async function getReportView(id: string): Promise<ReportView | null> {
  try {
    return await apiClient<ReportView>(`/api/reports/${id}/view`);
  } catch {
    return null;
  }
}

/** Scheduled social collection, switched on per workspace by the Narriv team (read-only for clients). */
export interface SocialAutoStatus {
  enabled: boolean;
  crisis: boolean;
  crisisMode: boolean;
  platforms: string[];
  roundsPerDay: number;
  monthSpendUsd: number;
  monthCapUsd: number;
  lastScheduledAt: string | null;
}

export async function getSocialAutoStatus(): Promise<SocialAutoStatus | null> {
  try {
    return await apiClient<SocialAutoStatus>("/api/ingestion/social-auto");
  } catch {
    return null;
  }
}

export interface NarrativeRecord {
  id: string;
  title: string;
  description: string;
  sourceCount: number;
  // Average persisted analysis confidence (0-100); null when no member is analysed.
  confidence: number | null;
  confidenceBasis?: string;
  impact: string;
  // "+X%" | "-X%" (last 24h vs previous 24h), "new" (no prior observations) or "—".
  velocity: string;
  momentum?: { last24h: number; prior24h: number; changePct: number | null; label: string; basis: string };
  firstSeen?: string | null;
  lastSeen?: string | null;
  memberSignalIds?: string[];
  recommendedFocus: string;
  signalCount: number;
  sentiment: string;
  risk?: NarrativeRisk | null;
  claims?: NarrativeClaim[];
  badges?: Array<"bot_like" | "toxic" | "anomalous" | "hoax" | "polarized">;
  platforms?: string[];
  audiences?: string[];
}

/** How dangerous a story is, 0–100 with its reasons (backend lib/narrative-risk.js). */
export interface NarrativeRisk { score: number; level: "critical" | "high" | "medium" | "low"; factors: Array<{ key: string; points: number; label: string }> }
/** A factual claim the issue rests on, checked against fact-check feeds (backend lib/claim-check.js). */
export interface NarrativeClaim { claim: string; status: "unverified" | "refuted" | "confirmed"; source: { title: string; url: string | null } | null }

export interface NarrativeDetailRecord extends NarrativeRecord {
  trends: Array<{ date: string; count: number }>;
  sentimentBreakdown: Record<string, number>;
  relatedSignals: Array<{
    id: string;
    title: string;
    content?: string | null;
    platform?: string | null;
    url?: string | null;
    sentiment: string;
    impact?: string | null;
    analysisConfidence?: number | null;
    capturedAt?: string | null;
    publishedAt?: string | null;
  }>;
  evidenceNote?: string | null;
  spread?: NarrativeSpread | null;
  journey?: NarrativeJourney | null;
  framing?: { frames: NarrativeFrame[]; at: string } | null;
  precedents?: NarrativePrecedent[];
  expectation?: NarrativeExpectation | null;
}

export type Tone = "positive" | "neutral" | "negative" | "mixed";
/** One angle from which an issue is told (backend lib/narrative-framing.js). */
export interface NarrativeFrame { label: string; summary: string; tone: Tone; count: number; outlets: string[]; recordIds: string[] }
/** How an issue's tone moved over time (backend lib/narrative-journey.js). */
export interface NarrativeJourney {
  records: number;
  origin?: { platform: string | null; outlet: string | null; at: string; mainstreamAt: string | null; hoursToMainstream: number | null; platforms: string[] };
  steps: Array<{ id: string; at: string; hoursAfterStart: number; tone: Tone; platform?: string | null; outlet: string | null; title: string | null; url: string | null }>;
  firstNegative: { at: string; hoursAfterStart: number; outlet: string | null } | null;
  peak: { day: string; count: number };
  negativeShare: { early: number; late: number; trend: "rising" | "falling" | "steady" | "few" };
  spanHours: number;
}

/** How a narrative spread, read from its linked records (backend lib/narrative-spread.js). */
export interface NarrativeSpread {
  records: number;
  spanHours: number;
  origin: { id: string; author: string | null; hidden: boolean; platform: string | null; title: string | null; url: string | null; at: string; timeBasis: "published" | "collected"; interactions: number };
  amplifiers: Array<{ name: string; platforms: string[]; posts: number; interactions: number; views: number; kind: "outlet" | "account"; firstAt: string; hoursAfterOrigin: number; isOrigin: boolean }>;
  hiddenAccounts: number;
  path: Array<{ platform: string; firstAt: string; records: number; interactions: number; hoursAfterOrigin: number }>;
  regions: { about: Array<{ name: string; count: number }>; from: Array<{ name: string; count: number }>; unplaced: number };
  textClusters: Array<{ kind: "coordination" | "syndication"; records: number; authors: number; platforms: string[]; firstAt: string; spanMinutes: number; sample: string | null; accounts: string[] }>;
}

export interface NarrativePrecedent {
  id: string;
  title: string;
  similarity: number;
  sharedWords: string[];
  sentiment: string | null;
  records: number;
  firstAt: string;
  lastAt: string;
  hoursToPeak: number;
  peakRecords: number;
  activeHours: number;
  negativeShare: number | null;
  actions: Array<{ title: string; status: string; type: string; createdAt: string }>;
}

export interface NarrativeExpectation {
  basedOn: number;
  medianHoursToPeak: number | null;
  medianActiveHours: number | null;
  ageHours: number;
  hoursUntilTypicalPeak: number | null;
  withActions: number;
}

/** A conversation growing right now that a brand could join (backend lib/content-waves.js). */
export interface ContentWave {
  id: string;
  title: string;
  description: string;
  records: number;
  momentum: { last24h: number; prior24h: number; changePct: number | null; label: string };
  positiveShare: number | null;
  negativeShare: number | null;
  interactions: number;
  platforms: string[];
  risk: { level: "go" | "careful" | "avoid"; reasons: Array<{ code: "negative" | "sensitive" | "coordination"; value: string | number }> };
  /** When the current burst began, when narratives here usually peak, and the hours left before that peak. */
  window: { burstAgeHours: number | null; typicalPeakHours: number | null; hoursToTypicalPeak: number | null; basedOn: number };
  samples: Array<{ title: string; platform: string | null; url: string | null }>;
}

export interface ContentIdeas {
  angles: Array<{ title: string; format: string; platform: string; hook: string }>;
  caution: string;
}

export async function getContentWaves(): Promise<ContentWave[]> {
  try {
    return (await apiClient<{ waves: ContentWave[] }>("/api/narratives/waves")).waves ?? [];
  } catch {
    return [];
  }
}

export async function getContentIdeas(narrativeId: string): Promise<ContentIdeas> {
  return apiClient<ContentIdeas>(`/api/narratives/${narrativeId}/content-ideas`, { method: "POST" });
}

export async function getNarratives(
  options: { page?: number; limit?: number; sentiment?: string; impact?: string; days?: number } = {}
): Promise<PaginatedResponse<NarrativeRecord> | null> {
  const { page = 1, limit = 10, sentiment, impact, days } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sentiment) params.set("sentiment", sentiment);
  if (impact) params.set("impact", impact);
  if (typeof days === "number") params.set("days", String(days));

  try {
    return await apiClient<PaginatedResponse<NarrativeRecord>>(`/api/narratives?${params.toString()}`);
  } catch {
    return null;
  }
}

export async function triggerClustering(workspaceId?: string): Promise<{
  message: string;
  signalsProcessed?: number;
  clustersFound?: number;
  clustersCreated?: number;
  signalsAttached?: number;
} | null> {
  try {
    return await apiClient<{
      message: string;
      signalsProcessed?: number;
      clustersFound?: number;
      clustersCreated?: number;
      signalsAttached?: number;
    }>("/api/narratives/cluster", {
      method: "POST",
      body: JSON.stringify(workspaceId ? { workspaceId } : {}),
    });
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

export interface FetchSignalsResult {
  success: boolean;
  jobId?: string | null;
  keyword?: string;
  totalFetched: number;
  newSignalsCreated: number;
  newRawDocsCreated?: number;
  skippedDuplicates?: number;
  message?: string;
}

export async function fetchLatestSignals(params?: {
  keyword?: string;
  sourceId?: string;
  rssUrl?: string;
  limit?: number;
}): Promise<FetchSignalsResult | null> {
  try {
    return await apiClient<FetchSignalsResult>("/ingestion/fetch", {
      method: "POST",
      body: JSON.stringify(params || {}),
    });
  } catch (err) {
    console.error("fetchLatestSignals error:", err);
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

export async function createReportExport(reportId: string, format: "json" | "pdf" | "csv" | "xlsx" = "json"): Promise<{ message: string; jobId: string }> {
  return await apiClient<{ message: string; jobId: string }>(`/api/reports/${reportId}/export`, {
    method: "POST",
    body: JSON.stringify({ format }),
  });
}

export async function downloadReportFile(reportId: string, format: "pdf" | "csv" | "xlsx"): Promise<void> {
  const token = typeof window !== "undefined" ? useAuthStore.getState().token : null;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/reports/${reportId}/export/file?format=${format}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // The file is written in the language the app is showing.
      "Accept-Language": useUiStore.getState().language === "id" ? "id" : "en",
    },
  });

  if (!res.ok) throw new Error("Failed to export report");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // The server names the file after the report title and period.
  const named = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") || "")?.[1];
  a.download = named || `narriv-report-${reportId.substring(0, 8)}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function getReportExportStatus(jobId: string): Promise<{ jobId: string; reportId: string; format: string; status: string; errorMessage?: string | null; signedUrl?: string | null }> {
  return await apiClient<{ jobId: string; reportId: string; format: string; status: string; errorMessage?: string | null; signedUrl?: string | null }>(`/api/reports/exports/${jobId}`);
}

export async function downloadReportExport(signedUrl: string): Promise<unknown | null> {
  try {
    const url = new URL(signedUrl);
    return await apiClient<unknown>(`${url.pathname}${url.search}`);
  } catch {
    return null;
  }
}

/** Move some of an issue's records into a new issue; the two are then never merged automatically again. */
export function splitNarrative(id: string, input: { signalIds: string[]; title: string }): Promise<{ id: string; title: string; moved: number }> {
  return apiClient(`/api/narratives/${id}/split`, { method: "POST", body: JSON.stringify(input) });
}
