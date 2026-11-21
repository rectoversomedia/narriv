/** Analyst tools (backend modules/tools). Re-exported from @/lib/api-service. */
import { apiClient } from "@/lib/apiClient";

export type ReconLens = { key: string; label: { id: string; en: string }; hits: number; byPlatform: Record<string, number>; level: "high" | "medium" | "low" | "none"; examples: Array<{ title: string; url: string; source?: string; publishedAt?: string | null }> };
export type ReconResult = { id: string | null; subject: string; days: number; at: string; sources: number; platforms: string[]; score: number; level: "critical" | "high" | "medium" | "low"; lenses: ReconLens[]; summary: string; recommendation: string | null; recent: Array<{ title: string; url: string; source?: string; publishedAt?: string | null; platform: string }> };
export type ClaimVerdict = "refuted" | "confirmed" | "likely_false" | "likely_true" | "unverified";
export type ClaimResult = { input: string; claim: string | null; verdict: ClaimVerdict; method: "fact_check" | "ai_assessment" | "none"; reason: string; factChecks: Array<{ title: string; url: string; verdict: string; publisher?: string }>; coverage: Array<{ title: string; url: string; source: string | null }> };
export type IssueBrief = { at: string; title: string; riskScore: number | null; records: number; summary: string; timeline: Array<{ when: string; what: string }>; actors: Array<{ name: string; role: string }>; coordination: string; claims: string; risk: string; recommendations: string[] };
export type IssueSimulation = { at: string; response: string | null; title: string; steps: Array<{ t: string; headline: string; sentiment: string; volume: string; note: string }>; audiences: Array<{ group: string; now: string; movable: boolean }>; risks: string[]; verdict: string; better?: string };
export type TelegramLink = { configured: boolean; bot: string | null; code: string | null; chats: Array<{ name: string; at: string }> };

const post = <T,>(path: string, body: unknown) => apiClient<T>(path, { method: "POST", body: JSON.stringify(body) });
export const runRecon = (subject: string, days = 365) => post<ReconResult>("/api/tools/recon", { subject, days });
export const getReconHistory = () => apiClient<{ data: ReconResult[] }>("/api/tools/recon");
export const checkClaim = (input: string) => post<ClaimResult>("/api/tools/claim-check", { input });
export const getIssueBrief = (id: string) => post<IssueBrief>(`/api/tools/issues/${id}/brief`, {});
export const simulateIssue = (id: string, response: string) => post<IssueSimulation>(`/api/tools/issues/${id}/simulate`, { response });
export const getTelegramLink = () => apiClient<TelegramLink>("/api/tools/telegram/link");
export const newTelegramCode = () => post<{ code: string; bot: string | null }>("/api/tools/telegram/link", {});
export type FutureIssue = { title: string; horizon: string; likelihood: number; impact: "high" | "medium" | "low"; why: string; evidence: string[]; earlySignals: string[]; prepare: string[]; audiences: string[]; related: Array<{ id: string; title: string }>; scenario?: Array<{ stage: string; what: string }>; ifIgnored?: string; lesson?: string };
export type FutureIssues = { forecasts: FutureIssue[]; basis: { records: number; issues: number; alerts: number }; at: string; cached?: boolean; empty?: boolean; progress?: Record<string, number[]> };
export const getFutureIssues = (refresh = false) => apiClient<FutureIssues>(`/api/tools/future-issues${refresh ? "?refresh=1" : ""}`);

export const saveFutureProgress = (title: string, done: number[]) => apiClient<{ progress: Record<string, number[]> }>("/api/tools/future-issues/progress", { method: "PUT", body: JSON.stringify({ title, done }) });
