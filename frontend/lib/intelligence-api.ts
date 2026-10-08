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
  reputationScore: number;
  reputationBand: "strong" | "stable" | "at_risk" | "critical" | "neutral";
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
  sources?: Array<{ id: string; kind: string; [k: string]: unknown }>;
  data?: { signals: number; alerts: number; clusters: number; windowHours: number };
  error?: string;
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
