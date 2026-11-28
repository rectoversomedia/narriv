/** Investigasi: issue origin, account profiles, automation signs, affiliation networks (backend actors.routes.js). */

import { apiClient } from "@/lib/apiClient";

export type Identity = { masked: boolean; reason: "privacy" | "authorised" | null };
export type AutomationLevel = "high" | "medium" | "low" | "publisher";
export type Automation = { score: number; level: AutomationLevel; reasons: Array<{ points: number; text: string }>; limited: boolean; pace?: number };

export type InvAccount = {
  id: string; handle: string; name: string | null; platform: string; publisher: boolean; masked: boolean;
  group: string | null; alsoIn: string[]; automation: Automation; posts: number; riskPosts: number; counterPosts: number; reach: number; escalations: number;
  firstAt: string | null; lastAt: string | null; city: string | null; province: string | null; locationClaimed: boolean;
  categories: Record<string, number>; ideologies: Record<string, number>; narratives: Array<{ id: string; title: string }>;
};

export type InvGroup = {
  id: string; label: string; ideology: string | null; stance: "risk" | "counter" | null; summary: string | null; size: number; posts: number;
  automated: number; automatedShare: number; hub: string | null; hubName: string | null; bridges: string[];
  narratives: Array<{ id: string; title: string; n: number }>; cities: Array<{ city: string; n: number }>;
};

export type InvStory = {
  id: string; title: string; category: string | null; legitimate: boolean; impact: string | null; lifecycle: string | null; posts: number; accounts: number; automatedShare: number;
  origin: { id: string; handle: string; at: string; title: string; platform: string; city: string | null; province: string | null; archiveId: string | null };
  firstAt: string; lastAt: string; cities: number; bursts: number; mainGroup: string | null;
};

export type InvOverview = {
  identity: Identity; days: number; limitedProfiles: boolean;
  stats: { accounts: number; automatedHigh: number; automatedMedium: number; bursts: number; groups: number; stories: number };
  stories: InvStory[]; groups: InvGroup[]; accounts: InvAccount[];
};

export type InvBurst = { text: string; accounts: string[]; accountIds: string[]; posts: number; firstAt: string; lastAt: string; spanMinutes: number };

export type InvStoryDetail = {
  identity: Identity;
  story: { id: string; title: string; summary: string | null; category: string | null; legitimate: boolean; impact: string | null; lifecycle: string | null };
  origin: InvStory["origin"] & { content: string | null; account: InvAccount | null };
  amplifiers: Array<InvAccount & { delayMinutes: number; repostOfOrigin: boolean }>;
  cities: Array<{ city: string; province: string | null; firstAt: string; posts: number; claimed: boolean }>;
  platforms: Array<{ platform: string; delayMinutes: number }>;
  bursts: InvBurst[];
  posts: number; accounts: number; automatedShare: number;
  groups: Array<{ id: string | null; label: string | null; posts: number; share: number }>;
  timeline: Array<{ at: string; posts: number; automated: number }>; stepHours: number; firstAt: string; lastAt: string;
  keyAccounts: InvAccount[];
  escalations: Array<{ target: string; at: string; title: string }>;
  evidence: Array<{ id: string; at: string; title: string; platform: string; account: string; accountId: string; city: string | null; province: string | null; archiveId: string | null; category: string | null }>;
};

export type InvAccountDetail = {
  identity: Identity;
  account: InvAccount & { profile: { createdAt: string; followers: number; following: number; defaultAvatar: boolean; bio: string | null; city: string; province: string; locationClaimed: boolean } | null };
  group: { id: string; label: string; ideology: string | null; stance: string | null; summary: string | null; size: number } | null;
  history: Array<{ at: string; text: string; kind: "profile" | "created" | "first_seen" | "escalation" }>;
  connections: Array<{ id: string; handle: string; group: string | null; weight: number; kinds: string[]; automation: AutomationLevel | null; direction: "reposts" | "reposted_by" | "same_text" }>;
  posts: Array<{ id: string; at: string; title: string; platform: string; category: string | null; city: string | null; archiveId: string | null; repostOf: string | null; story: string | null }>;
};

export type InvNetwork = {
  identity: Identity;
  nodes: Array<{ id: string; label: string; group: string | null; automation: AutomationLevel; score: number; reach: number; posts: number; bridge: boolean }>;
  edges: Array<{ source: string; target: string; weight: number; kinds: string[] }>;
  groups: Array<{ id: string; label: string; ideology: string | null; stance: string | null; size: number; automatedShare: number; summary: string | null }>;
};

export const getInvestigationOverview = () => apiClient<InvOverview>("/api/investigations/overview");
export const getInvestigationStory = (id: string) => apiClient<InvStoryDetail>(`/api/investigations/stories/${encodeURIComponent(id)}`);
export const getInvestigationAccount = (id: string) => apiClient<InvAccountDetail>(`/api/investigations/accounts/${encodeURIComponent(id)}`);
export const getInvestigationNetwork = () => apiClient<InvNetwork>("/api/investigations/network");
