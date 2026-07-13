/**
 * Common types shared across the Narriv application
 */

/**
 * Standard API response wrapper
 */
export interface APIResponse<T = unknown, M = Record<string, unknown>> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: M;
  timestamp: string;
}

/**
 * API error structure
 */
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>[];
  stack?: string;
}

/**
 * Success response helper type
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

/**
 * Error response helper type (renamed to avoid conflicts)
 */
export interface APIErrorResponse {
  success: false;
  error: APIError;
  timestamp: string;
}

/**
 * Pagination request parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Pagination response metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Sort options
 */
export interface SortOptions {
  field: string;
  order: "asc" | "desc";
}

/**
 * Filter operator types
 */
export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "notIn"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "between"
  | "isNull"
  | "isNotNull";

/**
 * Generic filter
 */
export interface Filter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * Query builder options
 */
export interface QueryOptions {
  filters?: Filter[];
  sort?: SortOptions;
  pagination?: PaginationParams;
  select?: string[];
  includeCount?: boolean;
}

/**
 * ISO 8601 DateTime string
 */
export type DateTimeString = string;

/**
 * UUID string
 */
export type UUID = string;

/**
 * Email address
 */
export type EmailAddress = string;

/**
 * URL string
 */
export type URLString = string;

/**
 * ISO language code
 */
export type LanguageCode = "en" | "id" | "ms" | "other";

/**
 * Supported timezones
 */
export const SUPPORTED_TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Singapore",
  "Asia/Tokyo",
] as const;

export type SupportedTimezone = (typeof SUPPORTED_TIMEZONES)[number];

/**
 * HTTP status codes
 */
export enum HTTPStatusCode {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  FATAL = "fatal",
}

/**
 * Structured log entry
 */
export interface LogEntry {
  level: LogLevel;
  event: string;
  message?: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  workspaceId?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: "ok" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  checks?: HealthCheck[];
}

/**
 * Individual health check
 */
export interface HealthCheck {
  name: string;
  status: "ok" | "degraded" | "unhealthy";
  latency?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Runtime health information
 */
export interface RuntimeHealth {
  status: "ok" | "degraded";
  timestamp: string;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  eventLoop: {
    lag: number;
    status: "ok" | "slow";
  };
  dependencies: DependencyHealth[];
}

/**
 * Dependency health status
 */
export interface DependencyHealth {
  name: string;
  status: "ok" | "degraded" | "unhealthy";
  latency?: number;
  error?: string;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: unknown) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Metrics snapshot
 */
export interface MetricsSnapshot {
  timestamp: string;
  requests: RequestMetrics;
  responses: ResponseMetrics;
  errors: ErrorMetrics;
  performance: PerformanceMetrics;
}

/**
 * Request metrics
 */
export interface RequestMetrics {
  total: number;
  byMethod: Record<string, number>;
  byEndpoint: Record<string, number>;
  active: number;
}

/**
 * Response metrics
 */
export interface ResponseMetrics {
  total: number;
  byStatusCode: Record<string, number>;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
}

/**
 * Error metrics
 */
export interface ErrorMetrics {
  total: number;
  byType: Record<string, number>;
  byEndpoint: Record<string, number>;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  eventLoopLag: number;
  activeConnections: number;
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult<T = unknown> {
  succeeded: T[];
  failed: Array<{ item: unknown; error: string }>;
  total: number;
  succeededCount: number;
  failedCount: number;
}

/**
 * ID generation options
 */
export interface IDGenerationOptions {
  prefix?: string;
  timestamp?: boolean;
  random?: boolean;
}

/**
 * Export format types
 */
export type ExportFormat = "csv" | "json" | "xlsx" | "pdf";

/**
 * Export request
 */
export interface ExportRequest {
  format: ExportFormat;
  filters?: Record<string, unknown>;
  columns?: string[];
  includeHeaders?: boolean;
}

/**
 * Export job status
 */
export interface ExportJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  format: ExportFormat;
  filePath?: string;
  fileSize?: number;
  recordCount?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * SSE event types
 */
export enum SSEEventType {
  SIGNAL_CREATED = "signal:created",
  SIGNAL_UPDATED = "signal:updated",
  SIGNAL_DELETED = "signal:deleted",
  ALERT_CREATED = "alert:created",
  ALERT_UPDATED = "alert:updated",
  ALERT_ESCALATED = "alert:escalated",
  NOTIFICATION = "notification",
  METRICS_UPDATE = "metrics:update",
  HEARTBEAT = "heartbeat",
}

/**
 * SSE event
 */
export interface SSEEvent<T = unknown> {
  type: SSEEventType;
  data: T;
  timestamp: string;
  workspaceId?: string;
}

/**
 * Webhook event types
 */
export enum WebhookEventType {
  SIGNAL_CREATED = "signal.created",
  SIGNAL_ANALYZED = "signal.analyzed",
  ALERT_CREATED = "alert.created",
  ALERT_UPDATED = "alert.updated",
  ALERT_ACKNOWLEDGED = "alert.acknowledged",
  ALERT_RESOLVED = "alert.resolved",
  WORKSPACE_MEMBER_ADDED = "workspace.member_added",
  WORKSPACE_MEMBER_REMOVED = "workspace.member_removed",
}

/**
 * Webhook payload
 */
export interface WebhookPayload<T = unknown> {
  event: WebhookEventType;
  timestamp: string;
  workspaceId: string;
  data: T;
  metadata?: {
    requestId: string;
    source: string;
  };
}
