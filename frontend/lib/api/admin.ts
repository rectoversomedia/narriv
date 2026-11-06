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
  social: { enabled: boolean; platforms: string[]; monthlyCapUsd: number; crisisMode: boolean; spendUsd: number };
  members: number;
  keywords: number;
  signals30d: number;
  lastSignalAt: string | null;
  openAlerts: number;
  aiCostMonth: number;
}

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
  generatedAt: string;
}

export interface AdminWorkspacePatch {
  plan?: WorkspacePlanKey;
  trialEndsAt?: string | null;
  monitoringPaused?: boolean;
  social?: { enabled?: boolean; platforms?: string[]; monthlyCapUsd?: number; crisisMode?: boolean };
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
