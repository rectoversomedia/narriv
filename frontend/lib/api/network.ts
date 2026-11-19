/** Conversation network (account-level comments from free sources). Re-exported from @/lib/api-service. */

import { apiClient } from "@/lib/apiClient";

export type NetworkTone = "positive" | "negative" | "neutral" | "mixed";
export type NetworkNode = { id: string; kind: "account" | "video"; label: string; camp: number | null; weight: number; comments?: number; likes?: number; repliesReceived?: number; tone?: NetworkTone; channel?: string; url?: string };
export type NetworkEdge = { source: string; target: string; kind: "comment" | "reply"; weight: number };
export type NetworkCamp = { id: number; size: number; comments: number; tone: NetworkTone; negativeShare: number; positiveShare: number; topAccounts: string[]; videos: Array<{ id: string; title: string; channel?: string; url?: string }> };
export type NetworkAccount = { name: string; comments: number; likes: number; repliesReceived: number; videos: number; camp: number | null; role: "trigger" | "amplifier" | "voice" | "participant"; tone: NetworkTone };
export type NetworkCoordination =
  | { kind: "same_text"; text: string; accounts: string[]; accountCount: number; posts: number; spanMinutes: number; firstAt: string; videos: number }
  | { kind: "burst"; account: string; posts: number; videos: number; firstAt: string; text: string };
export type NetworkSource = { key: "youtube_comments" | "telegram"; free: boolean; configured: boolean; items: number; videos?: number; channels?: string[] };
export type ConversationNetwork = {
  days: number;
  stats: { accounts: number; comments: number; replies: number; videos: number };
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  camps: NetworkCamp[];
  topAccounts: NetworkAccount[];
  coordination: NetworkCoordination[];
  sources: NetworkSource[];
  monitoringPaused?: boolean;
  privacyMode?: boolean;
};

export function getConversationNetwork(days: 7 | 30 | 90 = 30, clusterId?: string) {
  return apiClient<ConversationNetwork>(`/api/network?days=${days}${clusterId ? `&clusterId=${encodeURIComponent(clusterId)}` : ""}`);
}

export function collectNetworkComments() {
  return apiClient<{ videos: number; comments: number; failed: number; skipped?: string }>("/api/network/collect", { method: "POST", body: JSON.stringify({}) });
}
