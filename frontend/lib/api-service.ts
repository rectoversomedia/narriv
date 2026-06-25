/**
 * api-service.ts
 *
 * Production API service layer for Narriv.
 * Wraps apiClient with typed fetchers for each domain.
 * Returns null when the backend is unreachable so pages can show production empty/error states.
 *
 * Usage:
 *   import { getDashboardSummary, getSignals, getAlerts } from "@/lib/api-service";
 */

import type { LucideIcon } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import type { AuthUser } from "@/store/useAuthStore";

// ---------------------------------------------------------------------------
// Types — shaped to match actual backend responses
// ---------------------------------------------------------------------------

export interface DashboardKPIs {
  total_signals: number;
  analyzed_signals: number;
  positive_percentage: number;
  negative_percentage: number;
  neutral_percentage: number;
  mixed_percentage: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface PlatformCount {
  platform: string;
  count: number;
}

export interface LatestSignal {
  id: string;
  title: string;
  platform: string;
  sentiment: string;
  published_at: string;
}

export interface DashboardSummary {
  kpis: DashboardKPIs;
  trends: TrendPoint[];
  sentiment_distribution: { positive: number; negative: number; neutral: number; mixed: number };
  platform_distribution: PlatformCount[];
  latest_signals: LatestSignal[];
  top_topics?: Array<{ name: { en: string; id: string }; mentions: string; delta: string; tone: string }>;
  mini_topics?: Array<{ label: string; value: string; tone: string }>;
  sources_health?: Array<{ name: string; status: { en: string; id: string }; health: { en: string; id: string }; signals: string; tone: string }>;
  system_status?: string[];
}

export type DateRangeKey = "24h" | "7d" | "30d";

export interface DateRangeOptions {
  startDate?: string;
  endDate?: string;
}

export interface AuthSessionResponse {
  token: string;
  refreshToken?: string;
  user: Pick<AuthUser, "name" | "email">;
}

export async function loginWithPassword(input: { email: string; password: string }): Promise<AuthSessionResponse> {
  return await apiClient<AuthSessionResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
    auth: false,
    refreshOnUnauthorized: false,
  });
}

export interface RegisterResponse {
  requireVerification: boolean;
  email: string;
  verificationCode?: string; // Exposed in dev mode
}

export async function registerWithPassword(input: { name: string; email: string; password: string }): Promise<RegisterResponse> {
  return await apiClient<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
    auth: false,
    refreshOnUnauthorized: false,
  });
}

export async function verifyEmailCode(input: { email: string; code: string }): Promise<AuthSessionResponse> {
  return await apiClient<AuthSessionResponse>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(input),
    auth: false,
    refreshOnUnauthorized: false,
  });
}

export async function resendVerificationCode(input: { email: string }): Promise<{ success: boolean; verificationCode?: string }> {
  return await apiClient<{ success: boolean; verificationCode?: string }>("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify(input),
    auth: false,
    refreshOnUnauthorized: false,
  });
}

export interface PasswordResetRequestResponse {
  success: boolean;
  message: string;
  resetCode?: string;
  expiresAt?: string;
}

export async function requestPasswordReset(input: { email: string }): Promise<PasswordResetRequestResponse> {
  return await apiClient<PasswordResetRequestResponse>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(input),
    auth: false,
    refreshOnUnauthorized: false,
  });
}

export async function verifyPasswordResetCode(input: { email: string; code: string }): Promise<{ success: boolean; resetToken: string }> {
  return await apiClient<{ success: boolean; resetToken: string }>("/auth/verify-reset-code", {
    method: "POST",
    body: JSON.stringify(input),
    auth: false,
    refreshOnUnauthorized: false,
  });
}

export async function resetPasswordWithToken(input: { resetToken: string; newPassword: string }): Promise<{ success: boolean }> {
  return await apiClient<{ success: boolean }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
    auth: false,
    refreshOnUnauthorized: false,
  });
}

export function getDateRangeOptions(range: DateRangeKey): DateRangeOptions {
  const end = new Date();
  const start = new Date(end);

  if (range === "24h") {
    start.setHours(start.getHours() - 24);
  } else if (range === "7d") {
    start.setDate(start.getDate() - 7);
  } else {
    start.setDate(start.getDate() - 30);
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

export interface Signal {
  id: string;
  title: string | null;
  content: string;
  platform: string | null;
  sentiment: string | null;
  publishedAt: string | null;
  capturedAt: string;
}

export interface SignalAnalysis {
  id: string;
  signalId: string;
  sentiment: string | null;
  narrativeType: string | null;
  stakeholder: string | null;
  impact: string | null;
  summary: string | null;
  recommendedAction: string | null;
  confidenceScore: number | null;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface MetaPaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

export interface Alert {
  id: string;
  title: string;
  whatHappened: string | null;
  whyItMatters: string | null;
  whatToDo: string | null;
  severity: string | null;
  status: string;
  type: string | null;
  assignedTo?: string | null;
  assignedTeam?: string | null;
  deadline?: string | null;
  escalationLevel?: EscalationLevel | null;
  workflowStatus?: string | null;
  sources?: string[];
  createdAt: string;
}

export type EscalationLevel = "low" | "medium" | "high" | "critical";

export interface AssignmentInput {
  assignedTo?: string | null;
  assignedTeam?: string | null;
  deadline?: string | null;
  escalationLevel?: EscalationLevel;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getDashboardSummary(options: DateRangeOptions = {}): Promise<DashboardSummary | null> {
  const params = new URLSearchParams();
  if (options.startDate) params.set("startDate", options.startDate);
  if (options.endDate) params.set("endDate", options.endDate);
  const query = params.toString();

  try {
    return await apiClient<DashboardSummary>(`/api/dashboard/summary${query ? `?${query}` : ""}`);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------

export interface GetSignalsOptions {
  page?: number;
  limit?: number;
  keyword?: string;
  platform?: string;
  startDate?: string;
  endDate?: string;
  sentiment?: string;
}

export interface SignalsMeta {
  totalSignals: number;
  followUps: Array<{ title: string; badge: string; meta: string; time: string; tone: string }>;
  recommendations: Array<{ title: string; desc: string; badge: string; tone: string; icon?: LucideIcon }>;
  sourceDistribution: Array<{ name: string; value: string; color: string }>;
  timeline: number[];
  timelineLabels?: string[];
  investigationQueue: Array<{ title: string; meta: string; badge: string; tone: string }>;
  metrics?: {
    totalSignals24h: number;
    negativeSignals24h: number;
    criticalSignals24h: number;
  };
  aiSummary?: {
    title: string;
    content: { en: string; id: string };
    insight: { en: string; id: string };
  } | null;
}

export async function getSignalsMeta(): Promise<SignalsMeta | null> {
  try {
    return await apiClient<SignalsMeta>("/signals/meta");
  } catch {
    return null;
  }
}

export async function getSignals(
  options: GetSignalsOptions = {}
): Promise<PaginatedResponse<Signal> | null> {
  const { page = 1, limit = 20, keyword, platform, startDate, endDate } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (keyword) params.set("keyword", keyword);
  if (platform) params.set("platform", platform);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  try {
    return await apiClient<PaginatedResponse<Signal>>(`/signals?${params.toString()}`);
  } catch {
    return null;
  }
}

export async function getSignalById(
  id: string
): Promise<{ signal: Signal; analysis: SignalAnalysis | { status: string } } | null> {
  try {
    return await apiClient<{ signal: Signal; analysis: SignalAnalysis | { status: string } }>(
      `/signals/${id}`
    );
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export interface GetAlertsOptions {
  page?: number;
  limit?: number;
  status?: string;
  severity?: string;
}

export async function getAlerts(
  options: GetAlertsOptions = {}
): Promise<PaginatedResponse<Alert> | null> {
  const { page = 1, limit = 20, status, severity } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  if (severity) params.set("severity", severity);

  try {
    return await apiClient<PaginatedResponse<Alert>>(`/api/alerts?${params.toString()}`);
  } catch {
    return null;
  }
}

export async function getAlertById(id: string): Promise<Alert | null> {
  try {
    return await apiClient<Alert>(`/api/alerts/${id}`);
  } catch {
    return null;
  }
}

export async function updateAlertStatus(
  id: string,
  status: "open" | "acknowledged" | "resolved"
): Promise<Alert | null> {
  try {
    return await apiClient<Alert>(`/api/alerts/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  } catch {
    return null;
  }
}

export interface CreateAlertInput {
  title: string;
  type?: "risk" | "opportunity" | "positioning";
  severity?: "low" | "medium" | "high" | "critical";
  whatHappened?: string;
  whyItMatters?: string;
  whatToDo?: string;
  assignedTo?: string;
  assignedTeam?: string;
  deadline?: string;
  sources?: string[];
  workspaceId?: string;
}

export async function createAlert(input: CreateAlertInput): Promise<Alert | null> {
  return apiClient<Alert>("/api/alerts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ---------------------------------------------------------------------------
// Escalation Matrix
// ---------------------------------------------------------------------------

export interface EscalationMatrixRecord {
  id: string;
  workspaceId: string;
  level: string;
  roleName: string;
  slaMinutes: number;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type NotificationRuleTrigger = "severity" | "sentiment" | "sla" | "keyword";

export interface NotificationRuleRecord {
  id: string;
  trigger: NotificationRuleTrigger;
  condition: string;
  channels: string[];
  enabled: boolean;
}

export async function getEscalationMatrix(): Promise<EscalationMatrixRecord[] | null> {
  try {
    const response = await apiClient<{ data: EscalationMatrixRecord[] }>("/api/alerts/escalation-matrix");
    return response.data;
  } catch {
    return null;
  }
}

export async function updateEscalationMatrix(levels: Array<{ level: string; roleName: string; slaMinutes: number; isActive?: boolean; order: number }>): Promise<EscalationMatrixRecord[] | null> {
  try {
    const response = await apiClient<{ data: EscalationMatrixRecord[] }>("/api/alerts/escalation-matrix", {
      method: "POST",
      body: JSON.stringify({ levels }),
    });
    return response.data;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers — Build page data from backend responses
// ---------------------------------------------------------------------------

/** Map backend Alert[] → page shape used by AlertsPage */
export function buildAlertItems(alerts: Alert[]) {
  const severityTone: Record<string, string> = {
    high: "text-[#F97066]",
    medium: "text-[#FDB022]",
    low: "text-[#D0D5DD]",
  };

  return alerts.map((a) => ({
    id: a.id,
    title: a.title,
    metric: `${a.severity?.toUpperCase() ?? "OPEN"} · ${a.status}`,
    detail: a.whatHappened ?? a.whyItMatters ?? "",
    tone: severityTone[a.severity ?? "low"] ?? "text-[#D0D5DD]",
    status: a.status,
    assignedTo: a.assignedTo ?? null,
    assignedTeam: a.assignedTeam ?? null,
    deadline: a.deadline ?? null,
    escalationLevel: a.escalationLevel ?? "medium",
  }));
}

/** Map backend Signal[] → page shape used by SignalsPage */
export function buildSignalItems(apiSignals: Signal[]) {
  return apiSignals.map((s) => ({
    id: s.id,
    source: s.platform ?? "Unknown",
    sentiment: (s.sentiment ?? "neutral").toLowerCase(),
    excerpt: s.content,
    confidence: null,
    recommendation: "Review signal for action opportunities.",
    narrative: s.title ?? "Unnamed narrative",
    publishedAt: s.publishedAt,
    capturedAt: s.capturedAt,
  }));
}

// ---------------------------------------------------------------------------
// V2 Endpoints (Visibility, Action Plans, Reports, Sources)
// ---------------------------------------------------------------------------

export interface VisibilityResponse {
  score?: number | string;
  presence?: number | string;
  presenceMentions?: number | string;
  competitor?: number | string;
  prompts?: {
    prompt: string;
    engine: string;
    brand: string;
    competitor: string;
    brandTone?: string;
    compTone?: string;
  }[];
  geoActions?: { title: string; tag: string; highlighted?: boolean }[];
}

export async function updateAlertAssignment(id: string, input: AssignmentInput): Promise<Alert | null> {
  try {
    return await apiClient<Alert>(`/api/alerts/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export interface ActionPlanResponse {
  id?: string;
  inputNarrative?: string;
  evidenceSummary?: string;
  outputs?: [string, string][];
  plan?: [string, string][];
  assignedTo?: string | null;
  assignedTeam?: string | null;
  deadline?: string | null;
  escalationLevel?: EscalationLevel | null;
  workflowStatus?: string | null;
}

export interface ActionPlanLearningResponse {
  insights: Array<{
    titleKey: string;
    valueKey: string;
    icon: string;
  }>;
  templates: Array<{
    nameKey: string;
    usageCount: number;
  }>;
}

export async function getActionPlanLearning(id: string): Promise<ActionPlanLearningResponse | null> {
  try {
    return await apiClient<ActionPlanLearningResponse>(`/api/action-plans/${id}/learning`);
  } catch {
    return null;
  }
}

export type ActionStrategyType =
  | "pr_response"
  | "content_strategy"
  | "influencer_strategy"
  | "crisis_response";

export interface CreateActionPlanInput {
  workspaceId?: string;
  strategyType: ActionStrategyType;
  alertId?: string;
  clusterId?: string;
}

export interface CreatedActionPlan {
  id: string;
  title: string;
  strategyType: ActionStrategyType;
  createdAt: string;
}

export interface ActionQueueRecord {
  id: string;
  title: string;
  alert?: { title: string; severity: string | null } | null;
  cluster?: { title: string; sentiment: string | null } | null;
  createdAt: string;
}

export async function getActionPlans(): Promise<ActionPlanResponse | null> {
  try {
    return await apiClient<ActionPlanResponse>("/api/action-plans");
  } catch {
    return null;
  }
}

export async function getActionPlanById(id: string): Promise<ActionPlanResponse | null> {
  if (!id) return null;
  try {
    return await apiClient<ActionPlanResponse>(`/api/action-plans/${id}`);
  } catch {
    return null;
  }
}

export async function createActionPlan(input: CreateActionPlanInput): Promise<CreatedActionPlan | null> {
  try {
    return await apiClient<CreatedActionPlan>("/api/actions", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function updateActionPlanAssignment(id: string, input: AssignmentInput): Promise<ActionPlanResponse | null> {
  try {
    return await apiClient<ActionPlanResponse>(`/api/action-plans/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function getActionQueue(
  options: { page?: number; limit?: number } = {}
): Promise<MetaPaginatedResponse<ActionQueueRecord> | null> {
  const { page = 1, limit = 10 } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });

  try {
    return await apiClient<MetaPaginatedResponse<ActionQueueRecord>>(`/api/actions?${params.toString()}`);
  } catch {
    return null;
  }
}

export interface CurrentUserResponse {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface WorkspaceSettingsResponse {
  workspaceId: string;
  brandName: string | null;
  industry: string | null;
  timezone: string | null;
  notificationEmail: string | null;
  whatsappPIC: string | null;
  logoUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UpdateWorkspaceSettingsInput {
  brandName?: string | null;
  industry?: string | null;
  timezone?: string | null;
  notificationEmail?: string | null;
  whatsappPIC?: string | null;
}

export interface WorkspaceMemberRecord {
  id: string;
  workspaceId: string;
  userId: string;
  role: "owner" | "admin" | "analyst" | string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

export type WorkspaceMemberRole = "owner" | "admin" | "analyst";

export type CreateWorkspaceMemberInput =
  | { userId: string; role: WorkspaceMemberRole; workspaceId?: string }
  | { email: string; name?: string; role: WorkspaceMemberRole; workspaceId?: string };

export async function getCurrentUser(): Promise<CurrentUserResponse | null> {
  try {
    return await apiClient<CurrentUserResponse>("/auth/me");
  } catch {
    return null;
  }
}

export async function getWorkspaceSettings(): Promise<WorkspaceSettingsResponse | null> {
  try {
    return await apiClient<WorkspaceSettingsResponse>("/api/workspace/settings");
  } catch {
    return null;
  }
}

export async function updateWorkspaceSettings(input: UpdateWorkspaceSettingsInput): Promise<WorkspaceSettingsResponse | null> {
  try {
    return await apiClient<WorkspaceSettingsResponse>("/api/workspace/settings", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function getWorkspaceMembers(): Promise<WorkspaceMemberRecord[] | null> {
  try {
    const response = await apiClient<{ data: WorkspaceMemberRecord[] }>("/api/workspace/members");
    return response.data;
  } catch {
    return null;
  }
}

export async function createWorkspaceMember(input: CreateWorkspaceMemberInput): Promise<WorkspaceMemberRecord | null> {
  try {
    return await apiClient<WorkspaceMemberRecord>("/api/workspace/members", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function deleteWorkspaceMember(memberId: string): Promise<boolean> {
  try {
    await apiClient<{ success: boolean }>(`/api/workspace/members/${memberId}`, {
      method: "DELETE",
    });
    return true;
  } catch {
    return false;
  }
}

export async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<boolean> {
  try {
    await apiClient<{ success: boolean }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return true;
  } catch {
    return false;
  }
}

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

export async function getNotificationSettings(): Promise<NotificationSettings | null> {
  try {
    return await apiClient<NotificationSettings>("/api/workspace/notification-settings");
  } catch {
    return null;
  }
}

export async function updateNotificationSettings(input: Partial<Pick<NotificationSettings, "emailEnabled" | "whatsappEnabled" | "escalationNotifications" | "reminderNotifications" | "customRules">>): Promise<NotificationSettings | null> {
  return apiClient<NotificationSettings>("/api/workspace/notification-settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
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

export async function getActivityLogs(filters: ActivityLogFilters = {}): Promise<{ data: ActivityLogEntry[]; meta: { page: number; limit: number; total: number; totalPages: number } } | null> {
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
    return await apiClient<{ data: ActivityLogEntry[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(`/api/workspace/activity${query ? `?${query}` : ""}`);
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

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

export interface CaseRecord {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  sourceType: string | null;
  sourceId: string | null;
  assignedTo: string | null;
  assignedTeam: string | null;
  deadline: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseFilters {
  workspaceId?: string;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

export async function getCases(filters: CaseFilters = {}): Promise<{ data: CaseRecord[]; meta: { page: number; limit: number; total: number; totalPages: number } } | null> {
  const params = new URLSearchParams();
  if (filters.workspaceId) params.set("workspaceId", filters.workspaceId);
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  try {
    return await apiClient<{ data: CaseRecord[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(`/api/workspace/cases${query ? `?${query}` : ""}`);
  } catch {
    return null;
  }
}

export async function getCaseById(id: string): Promise<CaseRecord | null> {
  try {
    return await apiClient<CaseRecord>(`/api/workspace/cases/${id}`);
  } catch {
    return null;
  }
}

export async function createCase(input: { title: string; description?: string; priority?: string; sourceType?: string; sourceId?: string; assignedTo?: string; assignedTeam?: string; deadline?: string; workspaceId?: string }): Promise<CaseRecord | null> {
  return apiClient<CaseRecord>("/api/workspace/cases", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCase(id: string, input: Partial<Pick<CaseRecord, "title" | "description" | "status" | "priority" | "assignedTo" | "assignedTeam" | "deadline" | "resolution">>): Promise<CaseRecord | null> {
  try {
    return await apiClient<CaseRecord>(`/api/workspace/cases/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function deleteCase(id: string): Promise<boolean> {
  try {
    await apiClient<{ success: boolean }>(`/api/workspace/cases/${id}`, { method: "DELETE" });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

export interface IntegrationRecord {
  id: string;
  workspaceId: string;
  name: string;
  platform: string;
  status: string;
  config: Record<string, unknown> | null;
  lastSyncAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getIntegrations(filters: { workspaceId?: string; platform?: string; status?: string } = {}): Promise<{ data: IntegrationRecord[] } | null> {
  const params = new URLSearchParams();
  if (filters.workspaceId) params.set("workspaceId", filters.workspaceId);
  if (filters.platform) params.set("platform", filters.platform);
  if (filters.status) params.set("status", filters.status);

  const query = params.toString();
  try {
    return await apiClient<{ data: IntegrationRecord[] }>(`/api/workspace/integrations${query ? `?${query}` : ""}`);
  } catch {
    return null;
  }
}

export async function getIntegrationById(id: string): Promise<IntegrationRecord | null> {
  try {
    return await apiClient<IntegrationRecord>(`/api/workspace/integrations/${id}`);
  } catch {
    return null;
  }
}

export async function createIntegration(input: { name: string; platform: string; config?: Record<string, unknown> }): Promise<IntegrationRecord | null> {
  try {
    return await apiClient<IntegrationRecord>("/api/workspace/integrations", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function updateIntegration(id: string, input: Partial<Pick<IntegrationRecord, "name" | "status" | "config">>): Promise<IntegrationRecord | null> {
  try {
    return await apiClient<IntegrationRecord>(`/api/workspace/integrations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function deleteIntegration(id: string): Promise<boolean> {
  try {
    await apiClient<{ success: boolean }>(`/api/workspace/integrations/${id}`, { method: "DELETE" });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// AI Visibility Analysis
// ---------------------------------------------------------------------------

export async function triggerVisibilityAnalysis(input: { brandName: string; competitors?: string[]; queries: string[]; engineName?: string }): Promise<unknown | null> {
  try {
    return await apiClient<unknown>("/api/visibility/analyze", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Batch Signal Analysis
// ---------------------------------------------------------------------------

export async function batchAnalyzeSignals(input: { signalIds: string[] }): Promise<{ analyzed: number; failed: number; skipped: number; results: Array<{ signalId: string; status: string; analysis?: unknown; error?: string }> } | null> {
  try {
    return await apiClient<{ analyzed: number; failed: number; skipped: number; results: Array<{ signalId: string; status: string; analysis?: unknown; error?: string }> }>("/signals/batch-analyze", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source Health & Coverage
// ---------------------------------------------------------------------------

export interface SourceHealthSummary {
  total: number;
  active: number;
  healthy: number;
  warning: number;
  critical: number;
  unknown: number;
}

export async function getSourceHealth(): Promise<{ sources: Array<{ id: string; name: string; isActive: boolean; health: { health: string; score: number; lastSyncAt: string | null; recentJobs: number; successRate: number } }>; summary: SourceHealthSummary } | null> {
  try {
    return await apiClient("/sources/health");
  } catch {
    return null;
  }
}

export async function getSourceCoverage(): Promise<{ totalSources: number; activeSources: number; totalDocuments: number; coverageRate: number; typeCoverage: Record<string, { sources: number; active: number; documents: number }> } | null> {
  try {
    return await apiClient("/sources/coverage");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Ingestion — RSS & Webhook
// ---------------------------------------------------------------------------

export async function triggerRSSFeed(input: { sourceId: string; url: string; maxItems?: number }): Promise<{ fetched: number; created: number } | null> {
  try {
    return await apiClient<{ fetched: number; created: number }>(`/ingestion/rss/${input.sourceId}`, {
      method: "POST",
      body: JSON.stringify({ url: input.url, maxItems: input.maxItems }),
    });
  } catch {
    return null;
  }
}

export async function triggerWebhook(input: { sourceId: string; payload: Record<string, unknown> }): Promise<{ received: number; created: number } | null> {
  try {
    return await apiClient<{ received: number; created: number }>(`/ingestion/webhook/${input.sourceId}`, {
      method: "POST",
      body: JSON.stringify(input.payload),
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Report Templates & Generation
// ---------------------------------------------------------------------------

export interface ReportTemplate {
  key: string;
  name: string;
  description: string;
  format: string;
  cadence: string;
  sectionCount: number;
  isSystem?: boolean;
}

export async function getReportTemplates(): Promise<{ data: ReportTemplate[] } | null> {
  try {
    return await apiClient<{ data: ReportTemplate[] }>("/api/reports/templates");
  } catch {
    return null;
  }
}

export async function createReportTemplate(input: Partial<ReportTemplate>): Promise<ReportTemplate | null> {
  try {
    return await apiClient<ReportTemplate>("/api/reports/templates", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function updateReportTemplate(id: string, input: Partial<ReportTemplate>): Promise<ReportTemplate | null> {
  try {
    return await apiClient<ReportTemplate>(`/api/reports/templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function deleteReportTemplate(id: string): Promise<boolean> {
  try {
    await apiClient<{ success: boolean }>(`/api/reports/templates/${id}`, { method: "DELETE" });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Report Schedules
// ---------------------------------------------------------------------------

export interface ReportScheduleRecord {
  id: string;
  workspaceId: string;
  templateKey: string;
  name: string;
  cadence: string;
  dayOfWeek: string | null;
  timeOfDay: string;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getReportSchedules(): Promise<{ data: ReportScheduleRecord[] } | null> {
  try {
    return await apiClient<{ data: ReportScheduleRecord[] }>("/api/reports/schedules");
  } catch {
    return null;
  }
}

export async function createReportSchedule(input: Partial<ReportScheduleRecord>): Promise<ReportScheduleRecord | null> {
  try {
    return await apiClient<ReportScheduleRecord>("/api/reports/schedules", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function updateReportSchedule(id: string, input: Partial<ReportScheduleRecord>): Promise<ReportScheduleRecord | null> {
  try {
    return await apiClient<ReportScheduleRecord>(`/api/reports/schedules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function deleteReportSchedule(id: string): Promise<boolean> {
  try {
    await apiClient<{ success: boolean }>(`/api/reports/schedules/${id}`, { method: "DELETE" });
    return true;
  } catch {
    return false;
  }
}

export async function toggleReportSchedule(id: string): Promise<ReportScheduleRecord | null> {
  try {
    return await apiClient<ReportScheduleRecord>(`/api/reports/schedules/${id}/toggle`, { method: "PATCH" });
  } catch {
    return null;
  }
}

export async function generateReportFromTemplate(input: { templateKey: string; dateRange?: { start: string; end: string } }): Promise<{ id: string; title: string; template: string; sections: Array<{ id: string; title: string; data: unknown }>; createdAt: string } | null> {
  try {
    return await apiClient("/api/reports/generate", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function sendReportEmail(input: { reportId: string; recipientEmail?: string; subject?: string; body?: string }): Promise<{ sent: boolean; to?: string; reason?: string } | null> {
  try {
    return await apiClient(`/api/reports/${input.reportId}/send-email`, {
      method: "POST",
      body: JSON.stringify({ recipientEmail: input.recipientEmail, subject: input.subject, body: input.body }),
    });
  } catch {
    return null;
  }
}

export interface ReportRecord {
  id: string;
  title: string;
  sections: string;
  readiness: number;
  status: string;
}

export async function getReports(
  options: { page?: number; limit?: number } = {}
): Promise<PaginatedResponse<ReportRecord> | null> {
  const { page = 1, limit = 10 } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });

  try {
    return await apiClient<PaginatedResponse<ReportRecord>>(`/api/reports?${params.toString()}`);
  } catch {
    return null;
  }
}

export interface NarrativeRecord {
  id: string;
  title: string;
  description: string;
  sourceCount: number;
  confidence: number;
  impact: string;
  velocity: string;
  recommendedFocus: string;
  signalCount: number;
  sentiment: string;
}

export interface NarrativeDetailRecord extends NarrativeRecord {
  trends: Array<{ date: string; count: number }>;
  sentimentBreakdown: Record<string, number>;
  relatedSignals: Array<{
    id: string;
    title: string;
    content?: string | null;
    platform?: string | null;
    url?: string | null;
    sentiment: string;
    impact?: string | null;
    capturedAt?: string | null;
    publishedAt?: string | null;
  }>;
}

export async function getNarratives(
  options: { page?: number; limit?: number; sentiment?: string; impact?: string; days?: number } = {}
): Promise<PaginatedResponse<NarrativeRecord> | null> {
  const { page = 1, limit = 10, sentiment, impact, days } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (sentiment) params.set("sentiment", sentiment);
  if (impact) params.set("impact", impact);
  if (typeof days === "number") params.set("days", String(days));

  try {
    return await apiClient<PaginatedResponse<NarrativeRecord>>(`/api/narratives?${params.toString()}`);
  } catch {
    return null;
  }
}

export interface SourceRecord {
  id: string;
  workspaceId?: string;
  name: string;
  type: string;
  actorId?: string | null;
  inputConfig?: unknown;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  health?: string;
  coverage?: string;
  latency?: string;
}

export async function getSources(
  options: { page?: number; limit?: number; type?: string; isActive?: boolean; search?: string } = {}
): Promise<PaginatedResponse<SourceRecord> | null> {
  const { page = 1, limit = 50, type, isActive, search } = options;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (type) params.set("type", type);
  if (isActive !== undefined) params.set("isActive", String(isActive));
  if (search) params.set("search", search);

  try {
    return await apiClient<PaginatedResponse<SourceRecord>>(`/sources?${params.toString()}`);
  } catch {
    return null;
  }
}

export interface CreateSourceInput {
  name: string;
  type: string;
  actorId?: string;
  inputConfig?: Record<string, unknown>;
}

export interface UpdateSourceInput {
  name?: string;
  type?: string;
  actorId?: string | null;
  inputConfig?: Record<string, unknown>;
  isActive?: boolean;
}

export async function createSource(input: CreateSourceInput): Promise<SourceRecord | null> {
  try {
    return await apiClient<SourceRecord>("/sources", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function updateSource(sourceId: string, input: UpdateSourceInput): Promise<SourceRecord | null> {
  try {
    return await apiClient<SourceRecord>(`/sources/${sourceId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  } catch {
    return null;
  }
}

export async function deleteSource(sourceId: string): Promise<SourceRecord | null> {
  try {
    return await apiClient<SourceRecord>(`/sources/${sourceId}`, {
      method: "DELETE",
    });
  } catch {
    return null;
  }
}

export async function runSourceIngestion(sourceId: string): Promise<{ message: string; jobId: string } | null> {
  try {
    return await apiClient<{ message: string; jobId: string }>(`/ingestion/run/${sourceId}`, {
      method: "POST",
    });
  } catch {
    return null;
  }
}

export async function getIngestionStatus(jobId: string): Promise<{ status: string; errorMessage?: string | null } | null> {
  try {
    return await apiClient<{ status: string; errorMessage?: string | null }>(`/ingestion/status/${jobId}`);
  } catch {
    return null;
  }
}

export async function submitActionPlanFeedback(
  actionPlanId: string,
  action: "accepted" | "edited" | "rejected",
  reason?: string
): Promise<{ id: string; action: string } | null> {
  try {
    return await apiClient<{ id: string; action: string }>(`/api/action-plans/${actionPlanId}/feedback`, {
      method: "POST",
      body: JSON.stringify({ action, reason }),
    });
  } catch {
    return null;
  }
}

export async function logoutSession(refreshToken: string): Promise<boolean> {
  try {
    await apiClient<{ success: boolean }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function createReportExport(reportId: string, format: "json" | "pdf" = "json"): Promise<{ message: string; jobId: string } | null> {
  try {
    return await apiClient<{ message: string; jobId: string }>(`/api/reports/${reportId}/export`, {
      method: "POST",
      body: JSON.stringify({ format }),
    });
  } catch {
    return null;
  }
}

export async function getReportExportStatus(jobId: string): Promise<{ jobId: string; reportId: string; format: string; status: string; errorMessage?: string | null; signedUrl?: string | null } | null> {
  try {
    return await apiClient<{ jobId: string; reportId: string; format: string; status: string; errorMessage?: string | null; signedUrl?: string | null }>(`/api/reports/exports/${jobId}`);
  } catch {
    return null;
  }
}

export async function downloadReportExport(signedUrl: string): Promise<unknown | null> {
  try {
    const url = new URL(signedUrl);
    return await apiClient<unknown>(`${url.pathname}${url.search}`);
  } catch {
    return null;
  }
}


// Notifications API
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  data: AppNotification[];
  meta: {
    page: number;
    limit: number;
    total: number;
    unreadCount: number;
    totalPages: number;
  };
}

export async function getNotifications(page = 1, limit = 20): Promise<NotificationsResponse | null> {
  try {
    return await apiClient<NotificationsResponse>(`/api/notifications?page=${page}&limit=${limit}`);
  } catch {
    return null;
  }
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    const res = await apiClient<{ success: boolean }>(`/api/notifications/${id}/read`, { method: "PATCH" });
    return res.success;
  } catch {
    return false;
  }
}

export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    const res = await apiClient<{ success: boolean }>("/api/notifications/read-all", { method: "PATCH" });
    return res.success;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

export interface VisibilitySummaryResponse {
  kpis: {
    avg_visibility_score: number;
    avg_brand_presence_rate: number;
    avg_competitor_mention_rate: number;
    engines_tracked: number;
    total_analyses: number;
  };
  engine_breakdown: Array<{
    engineName: string;
    visibilityScore: number;
    brandPresenceRate: number;
    competitorMentionRate: number;
    lastChecked: string;
    metadata: Record<string, unknown>;
  }>;
}

export interface VisibilityTrendsResponse {
  period: {
    from: string;
    to: string;
    days: number;
  };
  trends: Array<{
    date: string;
    avg_visibility_score: number;
    avg_brand_presence_rate: number;
    avg_competitor_mention_rate: number;
    data_points: number;
  }>;
  engine_trends: Record<string, Array<{
    date: string;
    visibilityScore: number;
    brandPresenceRate: number;
    competitorMentionRate: number;
  }>>;
}

export async function getVisibility(workspaceId?: string): Promise<VisibilityResponse | null> {
  try {
    const qs = workspaceId ? `?workspaceId=${workspaceId}` : "";
    return await apiClient<VisibilityResponse>(`/api/visibility${qs}`);
  } catch {
    return null;
  }
}

export async function getVisibilitySummary(workspaceId?: string): Promise<VisibilitySummaryResponse | null> {
  try {
    const qs = workspaceId ? `?workspaceId=${workspaceId}` : "";
    return await apiClient<VisibilitySummaryResponse>(`/api/visibility/summary${qs}`);
  } catch {
    return null;
  }
}

export async function getVisibilityTrends(workspaceId?: string, engineName?: string, days?: number): Promise<VisibilityTrendsResponse | null> {
  try {
    const params = new URLSearchParams();
    if (workspaceId) params.set("workspaceId", workspaceId);
    if (engineName) params.set("engineName", engineName);
    if (days) params.set("days", String(days));
    const qs = params.toString();
    return await apiClient<VisibilityTrendsResponse>(`/api/visibility/trends${qs ? `?${qs}` : ""}`);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Alerts Summary
// ---------------------------------------------------------------------------

export interface AlertsSummaryResponse {
  total: number;
  by_severity: { critical: number; high: number; medium: number; low: number; info: number };
  by_status: { open: number; in_progress: number; resolved: number };
  by_type: Record<string, number>;
  last_7_days: number;
  previous_7_days: number;
  trend_delta: number;
  timeline: number[];
  timeline_labels: string[];
  avg_response_time_minutes: number | null;
  delivery_success_rate: number;
}

// ---------------------------------------------------------------------------
// Recovered Missing Endpoints
// ---------------------------------------------------------------------------

export async function exchangeOAuthCode(code: string): Promise<{ token: string; user: AuthUser; refreshToken: string }> {
  const res = await apiClient<{ token: string; user: AuthUser; refreshToken: string }>("/auth/oauth/exchange", {
    method: "POST",
    body: JSON.stringify({ code })
  });
  return res as { token: string; user: AuthUser; refreshToken: string };
}

export interface FeedbackAccuracyResponse {
  accuracy_score: number;
  acceptance_rate: number;
  rejection_rate: number;
  by_type: Record<string, { total: number; accuracy: number }>;
}

export async function getFeedbackAccuracy(options: Record<string, string | number | boolean> = {}): Promise<FeedbackAccuracyResponse | null> {
  try {
    const params = new URLSearchParams(options as Record<string, string>);
    return await apiClient<FeedbackAccuracyResponse>(`/api/feedback/accuracy?${params.toString()}`);
  } catch {
    return null;
  }
}

export async function getNarrativeById(id: string): Promise<NarrativeDetailRecord | null> {
  try {
    return await apiClient<NarrativeDetailRecord>(`/api/narratives/${id}`);
  } catch {
    return null;
  }
}

export interface ReportsAnalyticsResponse {
  format_distribution: {
    pdf: number;
    json: number;
  };
  popular_templates: Array<{
    name: string;
    count: number;
  }>;
  trend_timeline: Array<{
    date: string;
    count: number;
  }>;
}

export async function getReportsAnalytics(options: Record<string, string | number | boolean> = {}): Promise<ReportsAnalyticsResponse | null> {
  try {
    const params = new URLSearchParams(options as Record<string, string>);
    return await apiClient<ReportsAnalyticsResponse>(`/api/reports/analytics?${params.toString()}`);
  } catch {
    return null;
  }
}

export interface BatchIngestionResponse {
  total: number;
  queued: number;
  failed: number;
  failures: string[];
}

export async function runBatchSourceIngestion(sourceIds: string[]): Promise<BatchIngestionResponse | null> {
  try {
    const batches = Array.from({ length: Math.ceil(sourceIds.length / 25) }, (_, index) => sourceIds.slice(index * 25, index * 25 + 25));
    const summaries = await Promise.all(batches.map((batch) => apiClient<BatchIngestionResponse>("/ingestion/run", {
      method: "POST",
      body: JSON.stringify({ sourceIds: batch })
    })));

    return summaries.reduce<BatchIngestionResponse>((acc, summary) => ({
      total: acc.total + summary.total,
      queued: acc.queued + summary.queued,
      failed: acc.failed + summary.failed,
      failures: [...acc.failures, ...summary.failures],
    }), { total: 0, queued: 0, failed: 0, failures: [] });
  } catch {
    return null;
  }
}

export interface GetAlertsSummaryOptions {
  workspaceId?: string;
}

export async function getAlertsSummary(options: GetAlertsSummaryOptions = {}): Promise<AlertsSummaryResponse | null> {
  const params = new URLSearchParams();
  if (options.workspaceId) params.set("workspaceId", options.workspaceId);
  const qs = params.toString();

  try {
    return await apiClient<AlertsSummaryResponse>(`/api/alerts/summary${qs ? `?${qs}` : ""}`);
  } catch {
    return null;
  }
}

export interface BootstrapSourcesResponse {
  created: number;
  skipped: number;
}

export async function bootstrapDefaultSources(options: Record<string, unknown> = {}): Promise<BootstrapSourcesResponse | null> {
  try {
    return await apiClient<BootstrapSourcesResponse>("/sources/bootstrap-defaults", {
      method: "POST",
      body: JSON.stringify(options)
    });
  } catch {
    return null;
  }
}

export interface ActionPlanMetric {
  value: string | number;
  trend: number;
}

export interface ActionPlanMetricsResponse {
  active: ActionPlanMetric;
  inProgress: ActionPlanMetric;
  done: ActionPlanMetric;
  needsAttention: ActionPlanMetric;
  resolution: ActionPlanMetric;
}

export async function getActionPlansMetrics(): Promise<ActionPlanMetricsResponse | null> {
  try {
    return await apiClient<ActionPlanMetricsResponse>("/api/action-plans/metrics");
  } catch {
    return null;
  }
}
