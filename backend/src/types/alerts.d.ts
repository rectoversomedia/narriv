/**
 * Alert types for the Narriv application
 */

/**
 * Alert entity
 */
export interface Alert {
  id: string;
  workspaceId: string;
  title: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  whatHappened: string | null;
  whyItMatters: string | null;
  whatToDo: string | null;
  assignedTo: string | null;
  assignedTeam: string | null;
  deadline: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  escalationLevel: EscalationLevel | null;
  sources: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Alert types
 */
export enum AlertType {
  RISK = "risk",
  OPPORTUNITY = "opportunity",
  POSITIONING = "positioning",
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  INFO = "info",
}

/**
 * Alert statuses
 */
export enum AlertStatus {
  OPEN = "open",
  ACKNOWLEDGED = "acknowledged",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
}

/**
 * Escalation levels
 */
export enum EscalationLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Create alert input
 */
export interface CreateAlertInput {
  title: string;
  type: AlertType;
  severity: AlertSeverity;
  whatHappened?: string;
  whyItMatters?: string;
  whatToDo?: string;
  assignedTo?: string;
  assignedTeam?: string;
  deadline?: string;
  sources?: string[];
  workspaceId?: string;
}

/**
 * Update alert input
 */
export interface UpdateAlertInput {
  title?: string;
  type?: AlertType;
  severity?: AlertSeverity;
  status?: AlertStatus;
  whatHappened?: string;
  whyItMatters?: string;
  whatToDo?: string;
  assignedTo?: string;
  assignedTeam?: string;
  deadline?: string;
  escalationLevel?: EscalationLevel;
  sources?: string[];
}

/**
 * Update alert status input
 */
export interface UpdateAlertStatusInput {
  status: AlertStatus;
}

/**
 * Update alert assignment input
 */
export interface UpdateAlertAssignmentInput {
  assignedTo?: string | null;
  assignedTeam?: string | null;
  deadline?: string | null;
  escalationLevel?: EscalationLevel;
}

/**
 * Alert query parameters
 */
export interface AlertQueryParams {
  page?: number;
  limit?: number;
  type?: AlertType;
  severity?: AlertSeverity;
  status?: AlertStatus;
  workspaceId?: string;
  search?: string;
}

/**
 * Alert list response with pagination
 */
export interface AlertListResponse {
  data: Alert[];
  pagination: PaginationInfo;
}

/**
 * Pagination info
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Alert summary metrics
 */
export interface AlertSummary {
  total: number;
  bySeverity: SeverityCounts;
  byStatus: StatusCounts;
  byType: Record<string, number>;
  last7Days: number;
  previous7Days: number;
  trendDelta: number;
  timeline: number[];
  timelineLabels: string[];
  acknowledgedCount: number;
  resolvedCount: number;
  escalatedCount: number;
  overdueCount: number;
  avgResponseTimeMinutes: number | null;
  deliverySuccessRate: number;
  acknowledgmentRate: number;
  slaTargetMinutes: number | null;
}

/**
 * Counts by severity
 */
export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

/**
 * Counts by status
 */
export interface StatusCounts {
  open: number;
  in_progress: number;
  resolved: number;
}

/**
 * Escalation matrix entry
 */
export interface EscalationMatrix {
  id: string;
  workspaceId: string;
  name: string;
  level: number;
  order: number;
  slaMinutes: number | null;
  notifyChannels: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create escalation matrix input
 */
export interface CreateEscalationMatrixInput {
  name: string;
  level: number;
  order: number;
  slaMinutes?: number;
  notifyChannels?: string[];
  isActive?: boolean;
  workspaceId?: string;
}

/**
 * Update escalation matrix input
 */
export interface UpdateEscalationMatrixInput {
  name?: string;
  level?: number;
  order?: number;
  slaMinutes?: number | null;
  notifyChannels?: string[];
  isActive?: boolean;
}

/**
 * Alert with related data
 */
export interface AlertWithDetails extends Alert {
  sourceSignals: SignalSummary[];
  relatedAlerts: AlertSummary[];
  escalationHistory: EscalationHistoryEntry[];
}

/**
 * Signal summary for alert
 */
export interface SignalSummary {
  id: string;
  title: string;
  content: string;
  platform: string | null;
  capturedAt: string;
}

/**
 * Alert summary for related alerts
 */
export interface AlertSummary {
  id: string;
  title: string;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: string;
}

/**
 * Escalation history entry
 */
export interface EscalationHistoryEntry {
  id: string;
  alertId: string;
  fromLevel: EscalationLevel;
  toLevel: EscalationLevel;
  escalatedBy: string;
  escalatedAt: string;
  reason?: string;
}

/**
 * Alert notification
 */
export interface AlertNotification {
  alertId: string;
  workspaceId: string;
  title: string;
  severity: AlertSeverity;
  type: AlertType;
  assignedTo?: string;
  assignedTeam?: string;
  channels: NotificationChannel[];
  createdAt: string;
}

/**
 * Notification channel
 */
export enum NotificationChannel {
  EMAIL = "email",
  SLACK = "slack",
  TEAMS = "teams",
  WEBHOOK = "webhook",
  IN_APP = "in_app",
}

/**
 * Alert export format
 */
export type AlertExportFormat = "csv" | "json" | "xlsx" | "pdf";

/**
 * Alert export options
 */
export interface AlertExportOptions {
  format: AlertExportFormat;
  filters?: AlertQueryParams;
  includeHistory: boolean;
  columns?: string[];
}

/**
 * Bulk alert update
 */
export interface BulkAlertUpdate {
  alertIds: string[];
  updates: {
    status?: AlertStatus;
    assignedTo?: string | null;
    assignedTeam?: string | null;
    severity?: AlertSeverity;
  };
}

/**
 * Bulk alert update result
 */
export interface BulkAlertUpdateResult {
  updated: number;
  failed: number;
  errors: Array<{ alertId: string; error: string }>;
}

/**
 * Alert timeline data point
 */
export interface AlertTimelinePoint {
  timestamp: string;
  created: number;
  acknowledged: number;
  resolved: number;
}

/**
 * Alert priority rules
 */
export interface AlertPriorityRule {
  id: string;
  workspaceId: string;
  name: string;
  conditions: AlertCondition[];
  priority: AlertSeverity;
  isActive: boolean;
  createdAt: string;
}

/**
 * Alert condition for priority rules
 */
export interface AlertCondition {
  field: "sentiment" | "platform" | "source" | "keyword" | "sentiment_score";
  operator: "equals" | "contains" | "starts_with" | "ends_with" | "greater_than" | "less_than";
  value: string | number;
}

/**
 * Alert SLA status
 */
export interface AlertSLAStatus {
  alertId: string;
  slaTarget: string;
  slaDeadline: string;
  status: "on_track" | "at_risk" | "breached";
  remainingMinutes: number | null;
  breachedAt: string | null;
}
