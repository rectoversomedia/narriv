/**
 * Intelligence API Surface
 *
 * Typed wrappers around the Phase 2-4 backend intelligence endpoints.
 * Every function is read-only, returns a typed payload, and uses the
 * existing apiClient (so auth, 401-refresh, and error handling are
 * consistent with the rest of the app).
 *
 * No intelligence logic is duplicated here. The frontend is a viewer
 * of evidence-grounded outputs from the backend.
 */

import { apiClient } from "./apiClient";

export interface IntelligenceFact {
  kind: string;
  value: unknown;
  [k: string]: unknown;
}

export interface IntelligenceInference {
  kind: string;
  label: string;
  [k: string]: unknown;
}

export interface IntelligencePrediction {
  signal: string;
  label: string;
  confidence: number;
  timeframe: string;
  supporting: string[];
  assumptions: string[];
}

export interface IntelligenceRecommendation {
  action: string;
  reason: string;
  priority: "low" | "medium" | "high" | "critical";
  urgency: "monitor" | "this_week" | "today" | "immediate";
  expectedOutcome: string;
  evidence: string[];
  confidence: number;
  requiresApproval: true;
  // Evidence grounding (risk model v2+); optional for older responses.
  status?: "suggested";
  observedIssue?: string;
  sourceIds?: string[];
  confidenceBasis?: string;
  limitations?: string[];
  monitorNext?: string;
}

export interface RiskComponent {
  key: "negative_share" | "severity" | "volume_change" | "active_alerts" | "narrative_momentum";
  weight: number;
  value: number;
  contribution: number;
  reason: string;
  inputs: Record<string, unknown>;
  evidenceIds: string[];
}

export interface RiskModelExplanation {
  version: string;
  components: RiskComponent[];
  uncertainty: { level: "low" | "medium" | "high"; reasons: string[] };
  limitations: string[];
  sourceIds: string[];
}

export interface IntelligenceEvidence {
  type: string;
  [k: string]: unknown;
}

export interface NarrativeIntelligencePayload {
  label: string;
  status: "ok" | "insufficient_data";
  riskScore: number;
  riskBand: "low" | "medium" | "high" | "critical";
  riskModel?: RiskModelExplanation;
  facts: IntelligenceFact[];
  inferences: IntelligenceInference[];
  predictions: IntelligencePrediction[];
  recommendations: IntelligenceRecommendation[];
  evidence: IntelligenceEvidence[];
  generatedAt: string;
  windowHours: number;
  note?: string;
}

export interface EntityIntelligencePayload {
  label: string;
  status: string;
  generatedAt: string;
  windowHours: number;
  entities: Array<{
    entity: string;
    mentions: number;
    weightedScore: number;
    avgSentiment: number;
    topNarrativeTypes: Record<string, number>;
    topImpacts: Record<string, number>;
    signalIds: string[];
  }>;
  competitive: Array<{
    entity: string;
    mentions: number;
    weightedScore: number;
    avgSentiment: number;
    [k: string]: unknown;
  }>;
  evidence: IntelligenceEvidence[];
}

export interface ReputationIntelligencePayload {
  label: string;
  status: string;
  generatedAt: string;
  windowHours: number;
  reputationScore: number | null;
  reputationBand: "strong" | "stable" | "at_risk" | "critical" | "neutral" | "insufficient_data";
  facts: IntelligenceFact[];
  inferences: IntelligenceInference[];
  evidence: IntelligenceEvidence[];
  note?: string;
}

export interface PredictiveSignalsPayload {
  label: string;
  status: string;
  generatedAt: string;
  windowHours: number;
  signals: IntelligencePrediction[];
  evidence: IntelligenceEvidence[];
  disclaimer?: string;
}

export interface RecommendationsPayload {
  status: string;
  recommendations: IntelligenceRecommendation[];
  evidence: IntelligenceEvidence[];
  source?: Record<string, unknown>;
}

export interface TrendPayload {
  status: string;
  ratio: number | null;
  acceleration: number | null;
  deltas: number[];
  note?: string;
}

export interface GeoIntelligencePayload {
  status: "ok" | "no_data" | "insufficient_data";
  label?: string;
  generatedAt?: string;
  windowHours?: number;
  counts?: Record<string, number>;
  message?: string;
  evidence?: IntelligenceEvidence[];
  tablesChecked?: string[];
}

export interface ExecutiveBriefSection {
  summary: string;
  evidence?: IntelligenceEvidence[];
  items?: Array<{ clusterId: string; title: string; momentum: number; signalCount: number }>;
  score?: number;
  band?: string;
  label?: string;
  recommendations?: IntelligenceRecommendation[];
  whatToWatchNext?: IntelligencePrediction[];
}

export interface ExecutiveBriefPayload {
  grounded: boolean;
  title?: string;
  generatedAt: string;
  windowHours: number;
  sections: {
    whatChanged: ExecutiveBriefSection;
    biggestRisk: ExecutiveBriefSection;
    emergingIssue: ExecutiveBriefSection;
    competitiveMovement: ExecutiveBriefSection;
    opportunity: ExecutiveBriefSection;
    reputation: ExecutiveBriefSection;
    recommendedActions: IntelligenceRecommendation[];
    whatToWatchNext: IntelligencePrediction[];
  };
  disclaimer?: string;
  error?: string;
}

export interface AskNarrivPayload {
  grounded: boolean;
  answer?: string;
  sources?: Array<{ id: string; kind: string; title?: string | null; url?: string | null; [k: string]: unknown }>;
  data?: { signals: number; alerts: number; clusters: number; windowHours: number };
  error?: string;
  code?: string;
  meta?: { model: string | null; latencyMs: number | null; costUsd: number | null };
}

const I = (path: string, init?: RequestInit) =>
  apiClient<unknown>(`/ai${path}`, { auth: true, ...(init || {}) });

export async function getNarrativeIntelligence(windowHours = 24) {
  return (await I(`/narrative-intelligence?windowHours=${windowHours}`)) as NarrativeIntelligencePayload;
}

export async function getEntityIntelligence(windowHours = 24) {
  return (await I(`/entity-intelligence?windowHours=${windowHours}`)) as EntityIntelligencePayload;
}

export async function getReputationIntelligence(windowHours = 24) {
  return (await I(`/reputation-intelligence?windowHours=${windowHours}`)) as ReputationIntelligencePayload;
}

export async function getPredictiveSignals(windowHours = 24) {
  return (await I(`/predictive-signals?windowHours=${windowHours}`)) as PredictiveSignalsPayload;
}

export async function getRecommendations(windowHours = 24) {
  return (await I(`/recommendations?windowHours=${windowHours}`)) as RecommendationsPayload;
}

export async function getTrend(windowHours = 24) {
  return (await I(`/trend?windowHours=${windowHours}`)) as TrendPayload;
}

export async function getGeoIntelligence(windowHours = 168) {
  return (await I(`/geo-intelligence?windowHours=${windowHours}`)) as GeoIntelligencePayload;
}

export async function getExecutiveBrief(windowHours = 24) {
  return (await I(`/executive-brief?windowHours=${windowHours}`)) as ExecutiveBriefPayload;
}

export async function askNarriv(question: string, windowHours = 24) {
  return (await I(`/ask`, {
    method: "POST",
    body: JSON.stringify({ question, windowHours }),
  })) as AskNarrivPayload;
}

export async function getAiTasks() {
  return (await I("/tasks")) as { tasks: Array<{ task: string; complexity: string }> };
}

export async function getAiProviders() {
  return (await I("/providers")) as {
    tiers: Array<{ name: string; model: string; provider: string; temperature: number; maxTokens: number }>;
    providers: { openai: { configured: boolean; model: string | null }; anthropic: { configured: boolean; model: string } };
  };
}

// ---------------------------------------------------------------------------
// Pipeline status (GET /api/pipeline/status) — data freshness and provenance
// ---------------------------------------------------------------------------

export interface PipelineStatusPayload {
  workspaceId: string;
  generatedAt: string;
  scheduler: {
    lastRunAt: string | null;
    lastRunStatus: string | null;
    lastSuccessfulIngestionForWorkspace: string | null;
    lastRunForWorkspace?: {
      at: string;
      status: string;
      results: Array<{ keyword?: string; status?: string; fetched?: number; inserted?: number; deduplicated?: number; analyzed?: number; analysisFailed?: number; errorCategory?: string }>;
    } | null;
    health?: {
      slotsUtc: string[];
      lastScheduledRunAt: string | null;
      lastScheduledRunStatus: string | null;
      lastManualRunAt: string | null;
      expectedSlotsLast24h: number;
      missedSlotsLast24h: string[];
      recentRuns: Array<{ at: string; status: string; trigger: string | null; durationMs: number | null; keywords: number | null }>;
      basis: string;
    };
  };
  ingestion: { lastRawDocumentAt: string | null };
  analysis: {
    lastAnalysisAt: string | null;
    realSignals: number | null;
    unanalyzedRealSignals: number | null;
    analysisFailuresLast7d: number | null;
  };
  clustering: { lastClusterUpdateAt: string | null; clusters: number | null };
  alerts: {
    lastAlertAt: string | null;
    unresolved: number | null;
    notificationFailuresLast7d: number | null;
    activeNotificationIntegrations: number | null;
  };
  aiUsageLast30d: { calls: number; tokens: number; estimatedCostUsd: number };
  partial: boolean;
  errors: string[];
}

export async function getPipelineStatus() {
  return apiClient<PipelineStatusPayload>("/api/pipeline/status");
}

/** "3h ago" style relative time; null-safe. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return "unknown";
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
