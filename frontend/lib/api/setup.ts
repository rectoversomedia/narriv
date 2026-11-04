/** Notification settings, the activity log, onboarding and logo upload. Re-exported from @/lib/api-service. */

import { apiClient } from "@/lib/apiClient";
import { NotificationRuleRecord } from "./feeds";

// ---------------------------------------------------------------------------
// Notification Settings
// ---------------------------------------------------------------------------

export interface NotificationSettings {
  workspaceId: string;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  escalationNotifications: boolean;
  reminderNotifications: boolean;
  customRules?: NotificationRuleRecord[];
}

// The API returns the database row (snake_case); every caller reads camelCase. Without this, the switches never
// showed the stored state and the notification-rules modal always saw an empty rule list.
function toNotificationSettings(raw: Record<string, unknown> | null): NotificationSettings | null {
  if (!raw) return null;
  const pick = (camel: string, snake: string) => (raw[camel] !== undefined ? raw[camel] : raw[snake]);
  return {
    workspaceId: String(pick("workspaceId", "workspace_id") ?? ""),
    emailEnabled: pick("emailEnabled", "email_enabled") !== false,
    whatsappEnabled: pick("whatsappEnabled", "whatsapp_enabled") === true,
    escalationNotifications: pick("escalationNotifications", "escalation_notifications") !== false,
    reminderNotifications: pick("reminderNotifications", "reminder_notifications") !== false,
    customRules: (pick("customRules", "custom_rules") as NotificationRuleRecord[] | undefined) ?? [],
  };
}

export async function getNotificationSettings(): Promise<NotificationSettings | null> {
  try {
    return toNotificationSettings(await apiClient<Record<string, unknown>>("/api/workspace/notification-settings"));
  } catch {
    return null;
  }
}

export async function updateNotificationSettings(input: Partial<Pick<NotificationSettings, "emailEnabled" | "whatsappEnabled" | "escalationNotifications" | "reminderNotifications" | "customRules">>): Promise<NotificationSettings | null> {
  return toNotificationSettings(await apiClient<Record<string, unknown>>("/api/workspace/notification-settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  }));
}

// ---------------------------------------------------------------------------
// Activity / Audit Log
// ---------------------------------------------------------------------------

export interface ActivityLogEntry {
  id: string;
  userId: string | null;
  user: { id: string; name: string | null; email: string } | null;
  event: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ActivityLogFilters {
  workspaceId?: string;
  eventType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface ActivityLogMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  summary?: {
    actors: number;
    today: number;
    eventTypes: number;
  };
}

export async function getActivityLogs(filters: ActivityLogFilters = {}): Promise<{ data: ActivityLogEntry[]; meta: ActivityLogMeta } | null> {
  const params = new URLSearchParams();
  if (filters.workspaceId) params.set("workspaceId", filters.workspaceId);
  if (filters.eventType) params.set("eventType", filters.eventType);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  try {
    return await apiClient<{ data: ActivityLogEntry[]; meta: ActivityLogMeta }>(`/api/workspace/activity${query ? `?${query}` : ""}`);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export interface OnboardingWorkspaceResponse {
  id: string;
  name: string;
  slug: string;
  settings: { brandName: string | null; industry: string | null; timezone: string | null } | null;
  notificationSettings: { emailEnabled: boolean; whatsappEnabled: boolean; escalationNotifications: boolean; reminderNotifications: boolean } | null;
}

export async function createOnboardingWorkspace(input: { brandName: string; industry?: string; timezone?: string }): Promise<OnboardingWorkspaceResponse | null> {
  try {
    return await apiClient<OnboardingWorkspaceResponse>("/api/onboarding/workspace", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function createOnboardingSources(input: { workspaceId: string; sources: Array<{ name: string; type: string; actorId?: string; inputConfig?: Record<string, unknown> }> }): Promise<{ count: number } | null> {
  try {
    return await apiClient<{ count: number }>("/api/onboarding/sources", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function createOnboardingNotifications(input: { workspaceId: string; emailEnabled?: boolean; whatsappEnabled?: boolean; escalationNotifications?: boolean; reminderNotifications?: boolean }): Promise<boolean> {
  try {
    await apiClient<unknown>("/api/onboarding/notifications", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return true;
  } catch {
    return false;
  }
}

export async function createOnboardingTeam(input: { workspaceId: string; members: Array<{ email: string; role: string }> }): Promise<{ results: Array<{ email: string; status: string; role?: string }> } | null> {
  try {
    return await apiClient<{ results: Array<{ email: string; status: string; role?: string }> }>("/api/onboarding/team", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

// Get pre-configured Indonesia media source templates
export interface SourceTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  default_keywords: string[] | null;
  config: Record<string, unknown>;
  is_active: boolean;
}

export async function getSourceTemplates(category?: string): Promise<{ templates: SourceTemplate[]; grouped: Record<string, SourceTemplate[]>; total: number } | null> {
  try {
    const query = category ? `?category=${category}` : "";
    return await apiClient<{ templates: SourceTemplate[]; grouped: Record<string, SourceTemplate[]>; total: number }>(`/api/onboarding/source-templates${query}`);
  } catch {
    return null;
  }
}

// Create monitoring keywords
export async function createOnboardingKeywords(input: { workspaceId: string; keywords: string[] }): Promise<{ count: number; keywords: Array<{ id: string; keyword: string }> } | null> {
  try {
    return await apiClient<{ count: number; keywords: Array<{ id: string; keyword: string }> }>("/api/onboarding/keywords", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

// Complete onboarding & trigger ingestion
export interface OnboardingCompleteResponse {
  success: boolean;
  workspace: { id: string; name: string; onboarding_completed: boolean };
  onboarding: { completed: boolean; completed_at: string };
  ingestion: {
    triggered: boolean;
    jobs_created: number;
    jobs: Array<{ id: string; source_id: string; status: string }>;
  };
}

export async function completeOnboarding(input: { workspaceId: string; triggerIngestion?: boolean }): Promise<OnboardingCompleteResponse | null> {
  try {
    return await apiClient<OnboardingCompleteResponse>("/api/onboarding/complete", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// File Upload (Logo)
// ---------------------------------------------------------------------------

export async function uploadWorkspaceLogo(input: { workspaceId?: string; fileName: string; fileContent: string; mimeType: string }): Promise<{ url: string; fileName: string } | null> {
  try {
    return await apiClient<{ url: string; fileName: string }>("/api/workspace/logo", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}
