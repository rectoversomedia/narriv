/** Measured tone accuracy from human reviews (backend modules/quality). Re-exported from @/lib/api-service. */
import { apiClient } from "@/lib/apiClient";

export type ToneKey = "positive" | "neutral" | "negative" | "mixed";
export type ToneAccuracy = { n: number; accuracy: number | null; interval: { low: number; high: number } | null; byTone: Record<ToneKey, { n: number; accuracy: number | null }>; missedNegative: number; enough: boolean };
export type QualitySample = { id: string; title: string; excerpt: string; platform: string | null; url: string | null; aiTone: ToneKey; publisher: string | null };

export const getToneAccuracy = () => apiClient<ToneAccuracy>("/api/quality");
export const getQualitySample = (n = 20) => apiClient<{ data: QualitySample[] }>(`/api/quality/sample?n=${n}`);
export const reviewTone = (signalId: string, tone: ToneKey) => apiClient<{ correct: boolean }>("/api/quality/review", { method: "POST", body: JSON.stringify({ signalId, tone }) });

export type CveAccuracy = { n: number; accuracy: number | null; interval: { low: number; high: number } | null; enough: boolean; byCategory: Array<{ id: string; n: number; accuracy: number | null; dismissed: number; corrected: number }> };
/** PCVE category accuracy from the team's confirm / dismiss / correct reviews. */
export const getCveAccuracy = () => apiClient<CveAccuracy>("/api/quality/cve");
