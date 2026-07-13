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
 * Workspace plan types
 */
export enum WorkspacePlan {
  FREE = "free",
  STARTER = "starter",
  PROFESSIONAL = "professional",
  ENTERPRISE = "enterprise",
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
 * Available plans with limits
 */
export interface PlanLimits {
  plan: WorkspacePlan;
  name: string;
  maxMembers: number;
  maxSignalsPerDay: number;
  maxStorageGb: number;
  features: string[];
}

/**
 * Default plan limits
 */
export const PLAN_LIMITS: Record<WorkspacePlan, PlanLimits> = {
  [WorkspacePlan.FREE]: {
    plan: WorkspacePlan.FREE,
    name: "Free",
    maxMembers: 2,
    maxSignalsPerDay: 100,
    maxStorageGb: 1,
    features: ["basic_signals", "email_support"],
  },
  [WorkspacePlan.STARTER]: {
    plan: WorkspacePlan.STARTER,
    name: "Starter",
    maxMembers: 5,
    maxSignalsPerDay: 1000,
    maxStorageGb: 10,
    features: ["basic_signals", "email_support", "alerts", "reports"],
  },
  [WorkspacePlan.PROFESSIONAL]: {
    plan: WorkspacePlan.PROFESSIONAL,
    name: "Professional",
    maxMembers: 20,
    maxSignalsPerDay: 10000,
    maxStorageGb: 100,
    features: [
      "advanced_signals",
      "priority_support",
      "alerts",
      "reports",
      "integrations",
      "api_access",
    ],
  },
  [WorkspacePlan.ENTERPRISE]: {
    plan: WorkspacePlan.ENTERPRISE,
    name: "Enterprise",
    maxMembers: -1, // Unlimited
    maxSignalsPerDay: -1, // Unlimited
    maxStorageGb: -1, // Unlimited
    features: [
      "advanced_signals",
      "dedicated_support",
      "alerts",
      "reports",
      "integrations",
      "api_access",
      "sso",
      "audit_logs",
      "custom_retention",
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
