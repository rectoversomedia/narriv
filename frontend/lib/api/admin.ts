import { apiClient } from "../apiClient";
import type { WorkspacePlanKey } from "./workspace";

// The Narriv team's admin panel (backend /admin/platform). Only platform admins get data; everyone else gets 403.

export interface AdminWorkspace {
  id: string;
  name: string;
  createdAt: string;
  isDemo: boolean;
  /** Made by the team or automated tests (by owner email or name); hidden from client counts by default. */
  isTest: boolean;
  owner: { name: string | null; email: string | null } | null;
  plan: WorkspacePlanKey | null;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  trialExpired: boolean;
  monitoringPaused: boolean;
  /** The client can browse the full influencer database in action plans. */
  creatorAccess: boolean;
  /** Keywords checked every hour: the plan's number, or the team's override. */
  hourlyKeywords: number;
  keywordLimitOverride: number | null;
  billing: { status: BillingStatus; nextInvoiceAt: string | null; note: string };
  social: { enabled: boolean; tier?: string | null; platforms: string[]; monthlyCapUsd: number; crisisMode: boolean; spendUsd: number; monthlyRuns?: number; runsUsed?: number };
  members: number;
  keywords: number;
  signals30d: number;
  lastSignalAt: string | null;
  openAlerts: number;
  aiCostMonth: number;
}

export type BillingStatus = "none" | "paid" | "due" | "overdue";

export interface AdminTotals {
  workspaces: number;
  trials: number;
  endingSoon: number;
  expired: number;
  paid: number;
  socialOn: number;
  aiCostMonth: number;
  socialSpendMonth: number;
}

export interface AdminWorkspacesResponse {
  data: AdminWorkspace[];
  totals: AdminTotals;
  socialCapUsd: number;
  /** Rupiah per US dollar used to show costs (providers bill in dollars). */
  usdToIdr: number;
  generatedAt: string;
}

export interface AdminWorkspacePatch {
  plan?: WorkspacePlanKey;
  trialEndsAt?: string | null;
  monitoringPaused?: boolean;
  creatorAccess?: boolean;
  keywordLimit?: number | null;
  billing?: { status?: BillingStatus; nextInvoiceAt?: string | null; note?: string };
  social?: { enabled?: boolean; platforms?: string[]; monthlyCapUsd?: number; crisisMode?: boolean; addRuns?: number };
}

export async function getAdminMe(): Promise<boolean> {
  try {
    const res = await apiClient<{ isAdmin: boolean }>("/api/admin/platform/me");
    return res?.isAdmin === true;
  } catch {
    return false;
  }
}

export function getAdminWorkspaces(): Promise<AdminWorkspacesResponse> {
  return apiClient<AdminWorkspacesResponse>("/api/admin/platform/workspaces");
}

export function updateAdminWorkspace(id: string, patch: AdminWorkspacePatch) {
  return apiClient<Partial<AdminWorkspace> & { id: string }>(`/api/admin/platform/workspaces/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export type AdminTestEmailResult = { report: "sent" | "failed" | "no_report" | null; alert: "sent" | "failed" | null };

/** Sends a sample weekly report (with PDF) and a sample alert email to one address, to check delivery. */
export interface AdminRegionBackfillResult {
  processed: number;
  updated: number;
  nextOffset: number;
  done: boolean;
}

/** (Re)fills one demo scenario's workspace with its fictional dataset. */
export function seedAdminDemo(scenario: "brand" | "gov" | "cve") {
  return apiClient<{ scenario: string; signals: number; alerts: number; reports: number }>("/api/admin/platform/seed-demo", { method: "POST", body: JSON.stringify({ scenario }) });
}

/** One batch of filling in the province of stored records; call again with nextOffset until done. */
export function backfillAdminRegions(offset: number) {
  return apiClient<AdminRegionBackfillResult>("/api/admin/platform/backfill-regions", { method: "POST", body: JSON.stringify({ offset }) });
}

export function sendAdminTestEmail(to: string) {
  return apiClient<AdminTestEmailResult>("/api/admin/platform/test-email", { method: "POST", body: JSON.stringify({ to }) });
}

export type AdminQuote = {
  planId: string; kind: "press" | "influencer" | "video" | "ads" | "social"; workspaceId: string; workspace: string; planTitle: string; title: string;
  items: Array<{ id: string; name: string; sub: string; due: string | null }>;
  schedule: { start: string; end: string } | null;
  quote: import("./reports").QuoteState;
};
export const getAdminQuotes = (): Promise<{ data: AdminQuote[] }> => apiClient("/api/admin/platform/quotes");
export const sendAdminOffer = (planId: string, kind: string, input: { amount: number; notes?: string; validDays?: number }) =>
  apiClient(`/api/admin/platform/quotes/${planId}/${kind}`, { method: "PUT", body: JSON.stringify(input) });
export const setAdminInvoicePaid = (planId: string, kind: string, paid: boolean) =>
  apiClient(`/api/admin/platform/quotes/${planId}/${kind}/invoice`, { method: "PATCH", body: JSON.stringify({ paid }) });

/** Open a client workspace as the Narriv admin (joins it as an admin member). */
export const enterAdminWorkspace = (id: string): Promise<{ id: string; name: string; role: string }> =>
  apiClient(`/api/admin/platform/workspaces/${id}/enter`, { method: "POST", body: "{}" });
/** Delete a workspace and all its data; the exact name confirms it. */
export const deleteAdminWorkspace = (id: string, confirmName: string): Promise<{ deleted: boolean }> =>
  apiClient(`/api/admin/platform/workspaces/${id}`, { method: "DELETE", body: JSON.stringify({ confirmName }) });
