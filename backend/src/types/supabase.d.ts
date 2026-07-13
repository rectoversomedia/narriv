import { SupabaseClient, SupabaseClientOptions } from "@supabase/supabase-js";

/**
 * Supabase client types for the Narriv application
 */

/**
 * Custom Supabase client options with additional configuration
 */
export interface NarrivClientOptions extends SupabaseClientOptions<"public"> {
  tableNameMapping?: Record<string, string>;
}

/**
 * Wrapped Supabase client that auto-converts table names
 */
export interface NarrivSupabaseClient extends SupabaseClient {
  /**
   * Auto-converts table names from snake_case to PascalCase
   */
  from<T extends keyof DatabaseTables>(
    table: T | string
  ): ReturnType<SupabaseClient["from"]>;
}

/**
 * Database table names (snake_case)
 */
export type TableNameSnakeCase =
  | "users"
  | "refresh_tokens"
  | "password_reset_tokens"
  | "email_verification_tokens"
  | "oauth_accounts"
  | "workspaces"
  | "workspace_members"
  | "workspace_settings"
  | "workspace_notification_settings"
  | "sources"
  | "ingestion_jobs"
  | "raw_documents"
  | "signals"
  | "signal_analyses"
  | "alerts"
  | "escalation_matrices"
  | "narrative_clusters"
  | "narrative_cluster_signals"
  | "reports"
  | "report_exports"
  | "report_templates"
  | "report_schedules"
  | "action_plans"
  | "generated_assets"
  | "ai_feedback"
  | "ai_analysis_failure_logs"
  | "ai_visibility_results"
  | "prompt_test_runs"
  | "audit_logs"
  | "cases"
  | "integrations"
  | "token_usage"
  | "app_notifications";

/**
 * Database table names (PascalCase)
 */
export type TableNamePascalCase =
  | "User"
  | "RefreshToken"
  | "PasswordResetToken"
  | "EmailVerificationToken"
  | "OAuthAccount"
  | "Workspace"
  | "WorkspaceMember"
  | "WorkspaceSettings"
  | "WorkspaceNotificationSettings"
  | "Source"
  | "IngestionJob"
  | "RawDocument"
  | "Signal"
  | "SignalAnalysis"
  | "Alert"
  | "EscalationMatrix"
  | "NarrativeCluster"
  | "NarrativeClusterSignal"
  | "Report"
  | "ReportExport"
  | "ReportTemplate"
  | "ReportSchedule"
  | "ActionPlan"
  | "GeneratedAsset"
  | "AIFeedback"
  | "AIAnalysisFailureLog"
  | "AIVisibilityResult"
  | "PromptTestRun"
  | "AuditLog"
  | "Case"
  | "Integration"
  | "TokenUsage"
  | "AppNotification";

/**
 * Database table types (these would be generated from Supabase schema)
 * This is a simplified version - in production, use supabase-gen
 */
export interface DatabaseTables {
  User: UserTable;
  RefreshToken: RefreshTokenTable;
  PasswordResetToken: PasswordResetTokenTable;
  EmailVerificationToken: EmailVerificationTokenTable;
  OAuthAccount: OAuthAccountTable;
  Workspace: WorkspaceTable;
  WorkspaceMember: WorkspaceMemberTable;
  WorkspaceSettings: WorkspaceSettingsTable;
  WorkspaceNotificationSettings: WorkspaceNotificationSettingsTable;
  Source: SourceTable;
  IngestionJob: IngestionJobTable;
  RawDocument: RawDocumentTable;
  Signal: SignalTable;
  SignalAnalysis: SignalAnalysisTable;
  Alert: AlertTable;
  EscalationMatrix: EscalationMatrixTable;
  NarrativeCluster: NarrativeClusterTable;
  NarrativeClusterSignal: NarrativeClusterSignalTable;
  Report: ReportTable;
  ReportExport: ReportExportTable;
  ReportTemplate: ReportTemplateTable;
  ReportSchedule: ReportScheduleTable;
  ActionPlan: ActionPlanTable;
  GeneratedAsset: GeneratedAssetTable;
  AIFeedback: AIFeedbackTable;
  AIAnalysisFailureLog: AIAnalysisFailureLogTable;
  AIVisibilityResult: AIVisibilityResultTable;
  PromptTestRun: PromptTestRunTable;
  AuditLog: AuditLogTable;
  Case: CaseTable;
  Integration: IntegrationTable;
  TokenUsage: TokenUsageTable;
  AppNotification: AppNotificationTable;
}

/**
 * User table type
 */
export interface UserTable {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Refresh token table type
 */
export interface RefreshTokenTable {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

/**
 * Password reset token table type
 */
export interface PasswordResetTokenTable {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

/**
 * Email verification token table type
 */
export interface EmailVerificationTokenTable {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

/**
 * OAuth account table type
 */
export interface OAuthAccountTable {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Workspace table type
 */
export interface WorkspaceTable {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Workspace member table type
 */
export interface WorkspaceMemberTable {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  invited_by: string | null;
  joined_at: string;
}

/**
 * Workspace settings table type
 */
export interface WorkspaceSettingsTable {
  id: string;
  workspace_id: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Workspace notification settings table type
 */
export interface WorkspaceNotificationSettingsTable {
  id: string;
  workspace_id: string;
  email_enabled: boolean;
  slack_enabled: boolean;
  webhook_enabled: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Source table type
 */
export interface SourceTable {
  id: string;
  workspace_id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  status: string;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Ingestion job table type
 */
export interface IngestionJobTable {
  id: string;
  workspace_id: string;
  source_id: string;
  status: string;
  items_processed: number;
  items_failed: number;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  created_at: string;
}

/**
 * Raw document table type
 */
export interface RawDocumentTable {
  id: string;
  workspace_id: string;
  source_id: string | null;
  signal_id: string | null;
  content: string;
  metadata: Record<string, unknown>;
  captured_at: string;
  created_at: string;
}

/**
 * Signal table type
 */
export interface SignalTable {
  id: string;
  workspace_id: string;
  source_id: string | null;
  title: string;
  content: string;
  platform: string | null;
  sentiment: string | null;
  captured_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Signal analysis table type
 */
export interface SignalAnalysisTable {
  id: string;
  signal_id: string;
  sentiment: string;
  narrative_type: string;
  stakeholder: string | null;
  impact: string | null;
  summary: string | null;
  recommended_action: string | null;
  confidence_score: number | null;
  created_at: string;
}

/**
 * Alert table type
 */
export interface AlertTable {
  id: string;
  workspace_id: string;
  title: string;
  type: string;
  severity: string;
  status: string;
  what_happened: string | null;
  why_it_matters: string | null;
  what_to_do: string | null;
  assigned_to: string | null;
  assigned_team: string | null;
  deadline: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  escalation_level: string | null;
  sources: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Escalation matrix table type
 */
export interface EscalationMatrixTable {
  id: string;
  workspace_id: string;
  name: string;
  level: number;
  order: number;
  sla_minutes: number | null;
  notify_channels: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Narrative cluster table type
 */
export interface NarrativeClusterTable {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  sentiment: string | null;
  signal_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Narrative cluster signal table type
 */
export interface NarrativeClusterSignalTable {
  id: string;
  cluster_id: string;
  signal_id: string;
  created_at: string;
}

/**
 * Report table type
 */
export interface ReportTable {
  id: string;
  workspace_id: string;
  title: string;
  type: string;
  config: Record<string, unknown>;
  status: string;
  generated_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Report export table type
 */
export interface ReportExportTable {
  id: string;
  report_id: string;
  format: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
}

/**
 * Report template table type
 */
export interface ReportTemplateTable {
  id: string;
  workspace_id: string;
  name: string;
  config: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Report schedule table type
 */
export interface ReportScheduleTable {
  id: string;
  workspace_id: string;
  report_template_id: string;
  cron_expression: string;
  recipients: string[];
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Action plan table type
 */
export interface ActionPlanTable {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  priority: string | null;
  status: string;
  assigned_to: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Generated asset table type
 */
export interface GeneratedAssetTable {
  id: string;
  workspace_id: string;
  asset_type: string;
  content: string;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

/**
 * AI feedback table type
 */
export interface AIFeedbackTable {
  id: string;
  workspace_id: string;
  signal_id: string | null;
  feedback_type: string;
  rating: number | null;
  comment: string | null;
  created_by: string;
  created_at: string;
}

/**
 * AI analysis failure log table type
 */
export interface AIAnalysisFailureLogTable {
  id: string;
  workspace_id: string;
  signal_id: string | null;
  error_message: string;
  error_code: string | null;
  retry_count: number;
  resolved: boolean;
  created_at: string;
}

/**
 * AI visibility result table type
 */
export interface AIVisibilityResultTable {
  id: string;
  workspace_id: string;
  source_id: string;
  visibility_score: number;
  details: Record<string, unknown>;
  scanned_at: string;
  created_at: string;
}

/**
 * Prompt test run table type
 */
export interface PromptTestRunTable {
  id: string;
  workspace_id: string;
  prompt_template: string;
  test_input: string;
  expected_output: string | null;
  actual_output: string | null;
  passed: boolean | null;
  run_by: string;
  created_at: string;
}

/**
 * Audit log table type
 */
export interface AuditLogTable {
  id: string;
  user_id: string | null;
  workspace_id: string | null;
  event: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Case table type
 */
export interface CaseTable {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  assigned_team: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Integration table type
 */
export interface IntegrationTable {
  id: string;
  workspace_id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  status: string;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Token usage table type
 */
export interface TokenUsageTable {
  id: string;
  workspace_id: string;
  user_id: string | null;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number | null;
  created_at: string;
}

/**
 * App notification table type
 */
export interface AppNotificationTable {
  id: string;
  user_id: string;
  workspace_id: string | null;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

/**
 * Database result wrapper
 */
export interface DbResult<T> {
  data: T | null;
  error: DbError | null;
}

/**
 * Database error type
 */
export interface DbError {
  message: string;
  code: string;
  details?: string;
}

/**
 * Supabase connection status
 */
export interface SupabaseConnectionStatus {
  connected: boolean;
  url: string;
  timestamp: string;
  error?: string;
}
