/**
 * api-service.ts
 *
 * Production API service layer for Narriv.
 * Wraps apiClient with typed fetchers for each domain.
 * Falls back gracefully to mock data when the backend is unreachable.
 *
 * Usage:
 *   import { getDashboardSummary, getSignals, getAlerts } from "@/lib/api-service";
 */

import { apiClient } from "@/lib/apiClient";
import {
  commandMetrics,
  actionRecommendations,
  dataSources,
  geoVisibility,
  predictiveAlerts,
  reports,
  signals as mockSignals,
} from "@/lib/mock-data";

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
    return await apiClient<DashboardSummary>("/api/dashboard");
  } catch {
    // Backend unreachable — callers should fall back to mock data
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
// Helpers — Build dashboard KPI cards from real or mock data
// ---------------------------------------------------------------------------

export function buildDashboardMetrics(summary: DashboardSummary | null) {
  if (!summary) return commandMetrics; // graceful mock fallback

  const { kpis } = summary;
  return [
    {
      label: "Total Signals",
      value: String(kpis.total_signals),
      delta: `${kpis.analyzed_signals} analyzed`,
    },
    {
      label: "Positive Sentiment",
      value: `${kpis.positive_percentage}%`,
      delta: `${kpis.negative_percentage}% negative`,
    },
    {
      label: "Analyzed Signals",
      value: String(kpis.analyzed_signals),
      delta: `of ${kpis.total_signals} total`,
    },
    {
      label: "Neutral / Mixed",
      value: `${kpis.neutral_percentage + kpis.mixed_percentage}%`,
      delta: `${kpis.neutral_percentage}% neutral`,
    },
  ];
}

/** Map backend Alert[] → mock-data shape used by AlertsPage */
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

/** Map backend Signal[] → mock-data shape used by SignalsPage */
export function buildSignalItems(apiSignals: Signal[]) {
  return apiSignals.map((s) => ({
    id: s.id,
    source: s.platform ?? "Unknown",
    sentiment: (s.sentiment ?? "neutral").toLowerCase(),
    excerpt: s.content,
    confidence: 80, // confidence not in signal model yet; use placeholder
    recommendation: "Review signal for action opportunities.",
    narrative: s.title ?? "Unnamed narrative",
    publishedAt: s.publishedAt,
    capturedAt: s.capturedAt,
  }));
}

/** Returns mock signals shaped like buildSignalItems output */
export function getMockSignalItems() {
  return mockSignals.map((s, i) => ({ ...s, id: `mock-${i}` }));
}

/** Returns mock alert items shaped like buildAlertItems output */
export function getMockAlertItems() {
  return predictiveAlerts.map((a) => ({
    id: a.id,
    title: a.title,
    metric: `${a.probability}% · ${a.window}`,
    detail: a.drivers.join(" · "),
    tone:
      a.severity === "high"
        ? "text-[#F97066]"
        : a.severity === "medium"
          ? "text-[#FDB022]"
          : "text-[#D0D5DD]",
    status: a.status,
  }));
}

// ---------------------------------------------------------------------------
// V2 Endpoints (Visibility, Action Plans, Reports, Sources)
// ---------------------------------------------------------------------------

export async function getVisibility(): Promise<unknown | null> {
  try {
    return await apiClient<unknown>("/api/visibility");
  } catch {
    const mentionedPrompts = geoVisibility.prompts.filter((prompt) => prompt.brand === "Mentioned").length;

    return {
      score: geoVisibility.score,
      presence: geoVisibility.brandPresenceRate,
      presenceMentions: `${mentionedPrompts} of ${geoVisibility.prompts.length}`,
      competitor: geoVisibility.competitorMentionRate,
      prompts: geoVisibility.prompts.map((prompt, index) => ({
        prompt: prompt.prompt,
        engine: ["ChatGPT", "Perplexity", "Gemini"][index] ?? "AI",
        brand: prompt.brand,
        competitor: prompt.competitors,
        brandTone:
          prompt.brand === "Mentioned" ? "text-[#12B76A]" : "text-[#F97066]",
        compTone: prompt.competitors.startsWith("1") ? "text-[#FDB022]" : "text-[#F97066]",
      })),
      geoActions: [
        { title: "Create action plan from visibility gap", tag: "High impact", highlighted: true },
        ...actionRecommendations.slice(0, 2).map((action) => ({
          title: action.title,
          tag: action.impact,
        })),
      ],
    };
  }
}

export async function getActionPlans(): Promise<unknown | null> {
  try {
    return await apiClient<unknown>("/api/action-plans");
  } catch {
    const primary = actionRecommendations[0];

    return {
      inputNarrative:
        "Delivery reliability complaints are clustering into a trust issue across social, community, news, and AI answer surfaces.",
      evidenceSummary:
        "Evidence: 148 linked findings · 6 source types · 92% confidence · 84% escalation probability",
      outputs: [
        ["Primary action", primary.title],
        ["Channel", primary.channel],
        ["Impact / effort", `${primary.impact} impact · ${primary.effort} effort`],
        ["Confidence", `${primary.confidence}%`],
      ],
      plan: primary.steps.map((step, index) => [step, ["Today", "Next 6h", "24h", "48h"][index] ?? "Later"]),
    };
  }
}

export async function getReports(): Promise<unknown | null> {
  try {
    return await apiClient<unknown>("/api/reports");
  } catch {
    return { reports };
  }
}

export async function getSources(): Promise<unknown | null> {
  try {
    return await apiClient<unknown>("/sources");
  } catch {
    return {
      sources: dataSources.map((source, index) => ({
        id: `mock-source-${index}`,
        name: source.name,
        type: source.type.toLowerCase(),
        isActive: source.health === "Healthy",
        createdAt: new Date(Date.now() - index * 86400000).toISOString(),
        health: source.health,
        coverage: source.coverage,
        latency: source.latency,
      })),
    };
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
