/** Shared types, auth/session calls and date-range helpers. Re-exported from @/lib/api-service. */

import { apiClient } from "@/lib/apiClient";
import { type AuthUser } from "@/store/useAuthStore";

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

export interface GlobalActivityCountry {
  id: string;
  name: string;
  signals: number;
  level: "low" | "medium" | "high" | string;
  latest_at: string | null;
}

export interface GlobalActivityMarker {
  name: string;
  countryId: string;
  coordinates: [number, number];
  signals: number;
  level: "low" | "medium" | "high" | string;
  latest_at: string | null;
}

export interface GlobalActivitySummary {
  updated_at: string;
  total_signals: number;
  countries: GlobalActivityCountry[];
  markers: GlobalActivityMarker[];
}

export interface DashboardSummary {
  kpis: DashboardKPIs;
  trends: TrendPoint[];
  sentiment_distribution: { positive: number; negative: number; neutral: number; mixed: number };
  // Daily stored-sentiment counts for the last 7 UTC days (every day present).
  sentiment_trend?: Array<{ date: string; positive: number; neutral: number; negative: number; mixed: number; unanalyzed: number; total: number }> | null;
  platform_distribution: PlatformCount[];
  /** Publishers (news sites, accounts) with the most records in the period. */
  top_publishers?: Array<{ publisher: string; platform: string; count: number; negative: number; positive: number }>;
  /** Active monitoring keywords with their records in the period. */
  keyword_breakdown?: Array<{ keyword: string; count: number; negative: number; positive: number; neutral?: number; mixed?: number; last24h: number; daily?: number[] }>;
  latest_signals: LatestSignal[];
  global_activity?: GlobalActivitySummary;
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

export async function registerWithPassword(input: { name: string; email: string; password: string; company?: string; role?: string }): Promise<RegisterResponse> {
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
  // Raw snake_case fields (always present in API rows) and evidence fields.
  author?: string | null;
  captured_at?: string;
  published_at?: string | null;
  url?: string | null;
  narratives?: Array<{ id: string; title: string }>;
  analysisStatus?: "analyzed" | "unanalyzed";
  analysisConfidence?: number | null;
  /** Brand relevance from the record's own text; null when no brand is configured. */
  relevance?: "direct" | "indirect" | "competitor" | "unconfirmed" | null;
  /** The province the record is about ("Jawa Timur"); older records may hold a city or "ID". */
  region?: string | null;
  metadata?: { geo?: { provinces?: string[]; cities?: string[] } | null } & Record<string, unknown>;
  /** The CVE narrative category suggested for review, in CVE workspaces. */
  cve?: CveTag | null;
  /** True when privacy mode hid the account, link and handles of this record. */
  privacyMasked?: boolean;
}

export type CveCategory = "incitement" | "propaganda" | "dehumanization" | "delegitimization" | "recruitment" | "misinformation" | "counter_narrative";
export interface CveTag {
  category: CveCategory | "none";
  confidence: number;
  reason: string | null;
  corrected_from?: string | null;
  review?: { status: "confirmed" | "dismissed"; by: string; at: string };
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

export interface AlertEvidence {
  id: string;
  title: string;
  url: string | null;
  publisher: string | null;
  platform: string | null;
  sentiment: string;
  capturedAt: string | null;
  publishedAt: string | null;
}

export interface Alert {
  evidence?: AlertEvidence[];
  evidenceMissing?: number;
  triggeredBy?: string | null;
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
  // Action plans only: recorded workflow state.
  workflowStatus?: "pending" | "in_progress" | "blocked" | "done";
}
