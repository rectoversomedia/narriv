/**
 * Links from a finding to the records behind it. The selected workspace is
 * carried by the session (every API call is scoped to it); the period and
 * filters travel in the URL so the destination opens on the same evidence.
 */

export const MONITORING_PERIODS = [24, 168, 720] as const;
export type MonitoringPeriod = (typeof MONITORING_PERIODS)[number];
export type RelevanceFilter = "direct" | "other";
export type AnalysisFilter = "analyzed" | "pending";
export type SentimentFilter = "negative" | "positive" | "neutral" | "mixed";

export interface MonitoringFilters {
  hours?: MonitoringPeriod;
  narrative?: string;
  relevance?: RelevanceFilter;
  sentiment?: SentimentFilter;
  analysis?: AnalysisFilter;
  platform?: string;
}

const SENTIMENTS: SentimentFilter[] = ["negative", "positive", "neutral", "mixed"];
const ID = /^[A-Za-z0-9-]{1,64}$/;
const PLATFORM = /^[a-z_]{1,24}$/;

function query(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export function monitoringHref(f: MonitoringFilters = {}) {
  return `/signals${query({ hours: f.hours, narrative: f.narrative, relevance: f.relevance, sentiment: f.sentiment, analysis: f.analysis, platform: f.platform })}`;
}

/** Issues & Narratives works in days; 24 h is its 1-day view. */
export function hoursToDays(hours: number) {
  return hours <= 24 ? 1 : hours <= 168 ? 7 : hours <= 720 ? 30 : 90;
}

export function issueHref(narrativeId: string, hours?: number) {
  return `/intelligence${query({ narrative: narrativeId, days: hours ? hoursToDays(hours) : undefined })}`;
}

/** Reads Monitoring filters from a URL query, ignoring anything invalid. */
export function parseMonitoringFilters(search: string): MonitoringFilters {
  const p = new URLSearchParams(search);
  const out: MonitoringFilters = {};
  const hours = Number(p.get("hours"));
  if ((MONITORING_PERIODS as readonly number[]).includes(hours)) out.hours = hours as MonitoringPeriod;
  const narrative = p.get("narrative");
  if (narrative && ID.test(narrative)) out.narrative = narrative;
  const relevance = p.get("relevance");
  if (relevance === "direct" || relevance === "other") out.relevance = relevance;
  const sentiment = p.get("sentiment");
  if (sentiment && (SENTIMENTS as string[]).includes(sentiment)) out.sentiment = sentiment as SentimentFilter;
  const analysis = p.get("analysis");
  if (analysis === "analyzed" || analysis === "pending") out.analysis = analysis;
  const platform = p.get("platform");
  if (platform && PLATFORM.test(platform)) out.platform = platform;
  return out;
}

/** Reads the Issues & Narratives deep link (?narrative=&days=). */
export function parseIssueLink(search: string): { narrative?: string; days?: 1 | 7 | 30 | 90 } {
  const p = new URLSearchParams(search);
  const out: { narrative?: string; days?: 1 | 7 | 30 | 90 } = {};
  const narrative = p.get("narrative");
  if (narrative && ID.test(narrative)) out.narrative = narrative;
  const days = Number(p.get("days"));
  if ([1, 7, 30, 90].includes(days)) out.days = days as 1 | 7 | 30 | 90;
  return out;
}

/** The ISO start of a period ending now. */
export function periodStart(hours: number, now = Date.now()) {
  return new Date(now - hours * 3600 * 1000).toISOString();
}
