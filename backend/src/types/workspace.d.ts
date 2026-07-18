/**
 * Workspace types for the Narriv application
 */

/**
 * Workspace entity
 */
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: WorkspacePlan;
  settings: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
}

/**
 * Workspace plan types (matching pricing tiers)
 */
export enum WorkspacePlan {
  PILOT = "pilot",
  INTELLIGENCE = "intelligence",
  DECISION = "decision",
  COMMAND = "command",
}

/**
 * Workspace member entity
 */
export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
  invitedBy: string | null;
  joinedAt: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

/**
 * Workspace member roles
 */
export enum WorkspaceMemberRole {
  OWNER = "owner",
  ADMIN = "admin",
  EDITOR = "editor",
  VIEWER = "viewer",
}

/**
 * Workspace settings
 */
export interface WorkspaceSettings {
  timezone: string;
  language: string;
  dateFormat: string;
  notifications: NotificationSettings;
  retention: RetentionSettings;
  integrations: IntegrationSettings;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  emailEnabled: boolean;
  slackEnabled: boolean;
  webhookEnabled: boolean;
  alertChannels: string[];
  digestFrequency: "realtime" | "hourly" | "daily" | "weekly";
}

/**
 * Data retention settings
 */
export interface RetentionSettings {
  signalsDays: number;
  alertsDays: number;
  auditLogsDays: number;
}

/**
 * Integration settings
 */
export interface IntegrationSettings {
  slack?: SlackIntegrationConfig;
  teams?: TeamsIntegrationConfig;
  webhook?: WebhookConfig;
}

/**
 * Slack integration configuration
 */
export interface SlackIntegrationConfig {
  enabled: boolean;
  webhookUrl?: string;
  channel?: string;
  notifyOn: ("critical" | "high" | "medium" | "low")[];
}

/**
 * Microsoft Teams integration configuration
 */
export interface TeamsIntegrationConfig {
  enabled: boolean;
  webhookUrl?: string;
  notifyOn: ("critical" | "high" | "medium" | "low")[];
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  enabled: boolean;
  url: string;
  secret?: string;
  events: string[];
}

/**
 * Create workspace input
 */
export interface CreateWorkspaceInput {
  name: string;
  slug?: string;
  plan?: WorkspacePlan;
  settings?: Partial<WorkspaceSettings>;
}

/**
 * Update workspace input
 */
export interface UpdateWorkspaceInput {
  name?: string;
  slug?: string;
  settings?: Partial<WorkspaceSettings>;
}

/**
 * Invite member input
 */
export interface InviteMemberInput {
  email: string;
  role: WorkspaceMemberRole;
  workspaceId?: string;
}

/**
 * Update member input
 */
export interface UpdateMemberInput {
  role?: WorkspaceMemberRole;
  workspaceId?: string;
}

/**
 * Workspace with member count
 */
export interface WorkspaceWithStats extends Workspace {
  memberCount: number;
  signalCount: number;
  alertCount: number;
  lastActivityAt: string | null;
}

/**
 * Workspace access check result
 */
export interface WorkspaceAccess {
  hasAccess: boolean;
  workspaceId: string;
  role: WorkspaceMemberRole | null;
  permissions: string[];
}

/**
 * Available plans with limits (matching pricing image)
 */
export interface PlanLimits {
  plan: WorkspacePlan;
  name: string;
  tagline: string;
  priceIdr: number;
  maxMembers: number;
  maxTopics: number;
  maxSignalsPerMonth: number;
  maxAlertsPerMonth: number;
  maxReportsPerMonth: number;
  maxAiAnalysesPerMonth: number;
  dataRetentionDays: number;
  features: string[];
}

/**
 * Default plan limits (matching pricing image)
 */
export const PLAN_LIMITS: Record<WorkspacePlan, PlanLimits> = {
  [WorkspacePlan.PILOT]: {
    plan: WorkspacePlan.PILOT,
    name: "PILOT",
    tagline: "Validate the value",
    priceIdr: 5000000,
    maxMembers: 1,
    maxTopics: 5,
    maxSignalsPerMonth: 10000,
    maxAlertsPerMonth: 100,
    maxReportsPerMonth: 10,
    maxAiAnalysesPerMonth: 500,
    dataRetentionDays: 30,
    features: ["signals_monitoring", "alerts", "email_notifications"],
  },
  [WorkspacePlan.INTELLIGENCE]: {
    plan: WorkspacePlan.INTELLIGENCE,
    name: "INTELLIGENCE",
    tagline: "Understand what matters",
    priceIdr: 25000000,
    maxMembers: 10,
    maxTopics: 50,
    maxSignalsPerMonth: 100000,
    maxAlertsPerMonth: 1000,
    maxReportsPerMonth: 100,
    maxAiAnalysesPerMonth: 5000,
    dataRetentionDays: 365,
    features: [
      "signals_monitoring",
      "alerts",
      "email_notifications",
      "intelligence",
      "ai_visibility",
      "whatsapp_notifications",
      "monthly_report",
    ],
  },
  [WorkspacePlan.DECISION]: {
    plan: WorkspacePlan.DECISION,
    name: "DECISION",
    tagline: "Turn intelligence into action",
    priceIdr: 50000000,
    maxMembers: 50,
    maxTopics: 200,
    maxSignalsPerMonth: 500000,
    maxAlertsPerMonth: 5000,
    maxReportsPerMonth: 500,
    maxAiAnalysesPerMonth: 20000,
    dataRetentionDays: 365,
    features: [
      "signals_monitoring",
      "alerts",
      "email_notifications",
      "intelligence",
      "ai_visibility",
      "whatsapp_notifications",
      "monthly_report",
      "action_center",
      "escalation_workflow",
      "slack_integration",
      "teams_integration",
      "weekly_report",
    ],
  },
  [WorkspacePlan.COMMAND]: {
    plan: WorkspacePlan.COMMAND,
    name: "COMMAND",
    tagline: "Operationalize intelligence",
    priceIdr: 100000000,
    maxMembers: -1, // Unlimited
    maxTopics: -1, // Unlimited
    maxSignalsPerMonth: -1, // Unlimited
    maxAlertsPerMonth: -1, // Unlimited
    maxReportsPerMonth: -1, // Unlimited
    maxAiAnalysesPerMonth: -1, // Unlimited
    dataRetentionDays: -1, // Unlimited
    features: [
      "signals_monitoring",
      "alerts",
      "email_notifications",
      "intelligence",
      "ai_visibility",
      "whatsapp_notifications",
      "monthly_report",
      "action_center",
      "escalation_workflow",
      "slack_integration",
      "teams_integration",
      "weekly_report",
      "custom_ai_models",
      "api_access",
      "dedicated_infrastructure",
      "enterprise_sla",
      "dedicated_success_manager",
      "quarterly_review",
    ],
  },
};

/**
 * Workspace statistics
 */
export interface WorkspaceStats {
  workspaceId: string;
  totalSignals: number;
  signalsToday: number;
  signalsThisWeek: number;
  signalsThisMonth: number;
  totalAlerts: number;
  openAlerts: number;
  criticalAlerts: number;
  totalReports: number;
  memberCount: number;
  lastActivityAt: string | null;
  createdAt: string;
}

/**
 * Member summary for workspace
 */
export interface MemberSummary {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: WorkspaceMemberRole;
  joinedAt: string;
  lastActiveAt: string | null;
}

/**
 * Pending invitations
 */
export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceMemberRole;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
}
