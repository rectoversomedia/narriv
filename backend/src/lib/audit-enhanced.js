/**
 * Enhanced Audit Logging Service
 *
 * Comprehensive audit trail for government compliance:
 * - All mutations logged with before/after state
 * - User attribution for every action
 * - IP address and user agent tracking
 * - Async non-blocking writes
 * - Batch writes for performance
 * - Sensitive data masking
 * - Compliance report generation
 */

import { logStructured } from "./logger.js";

// Audit log queue for batch processing
let auditQueue = [];
let flushTimer = null;
const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 1000; // 1 second

// Event types
export const AUDIT_EVENTS = {
    // Authentication
    AUTH_LOGIN: "auth.login",
    AUTH_LOGOUT: "auth.logout",
    AUTH_FAILED: "auth.failed",
    AUTH_REFRESH: "auth.refresh",
    AUTH_PASSWORD_CHANGE: "auth.password_change",
    AUTH_PASSWORD_RESET: "auth.password_reset",
    AUTH_VERIFY_EMAIL: "auth.verify_email",
    AUTH_OAUTH_INITIATE: "auth.oauth_initiate",
    AUTH_OAUTH_CALLBACK: "auth.oauth_callback",

    // User Management
    USER_CREATE: "user.create",
    USER_UPDATE: "user.update",
    USER_DELETE: "user.delete",
    USER_SESSION_CREATE: "user.session_create",
    USER_SESSION_DESTROY: "user.session_destroy",

    // Workspace
    WORKSPACE_CREATE: "workspace.create",
    WORKSPACE_UPDATE: "workspace.update",
    WORKSPACE_DELETE: "workspace.delete",
    WORKSPACE_SETTING_UPDATE: "workspace.setting_update",
    WORKSPACE_LOGO_UPLOAD: "workspace.logo_upload",

    // Workspace Members
    MEMBER_ADD: "member.add",
    MEMBER_UPDATE: "member.update",
    MEMBER_REMOVE: "member.remove",
    MEMBER_ROLE_CHANGE: "member.role_change",

    // Sources
    SOURCE_CREATE: "source.create",
    SOURCE_UPDATE: "source.update",
    SOURCE_DELETE: "source.delete",
    SOURCE_TOGGLE: "source.toggle",
    SOURCE_SYNC: "source.sync",
    SOURCE_HEALTH_CHECK: "source.health_check",

    // Signals
    SIGNAL_CREATE: "signal.create",
    SIGNAL_UPDATE: "signal.update",
    SIGNAL_DELETE: "signal.delete",
    SIGNAL_ANALYZE: "signal.analyze",
    SIGNAL_BATCH_ANALYZE: "signal.batch_analyze",

    // Alerts
    ALERT_CREATE: "alert.create",
    ALERT_UPDATE: "alert.update",
    ALERT_DELETE: "alert.delete",
    ALERT_STATUS_CHANGE: "alert.status_change",
    ALERT_ASSIGN: "alert.assign",
    ALERT_ESCALATE: "alert.escalate",
    ALERT_ACKNOWLEDGE: "alert.acknowledge",
    ALERT_RESOLVE: "alert.resolve",

    // Narratives
    NARRATIVE_CREATE: "narrative.create",
    NARRATIVE_UPDATE: "narrative.update",
    NARRATIVE_DELETE: "narrative.delete",
    NARRATIVE_CLUSTER: "narrative.cluster",

    // Reports
    REPORT_CREATE: "report.create",
    REPORT_UPDATE: "report.update",
    REPORT_DELETE: "report.delete",
    REPORT_EXPORT: "report.export",
    REPORT_EMAIL_SEND: "report.email_send",
    REPORT_TEMPLATE_CREATE: "report.template_create",
    REPORT_TEMPLATE_UPDATE: "report.template_update",
    REPORT_TEMPLATE_DELETE: "report.template_delete",
    REPORT_SCHEDULE_CREATE: "report.schedule_create",
    REPORT_SCHEDULE_UPDATE: "report.schedule_update",
    REPORT_SCHEDULE_DELETE: "report.schedule_delete",

    // Actions & Action Plans
    ACTION_CREATE: "action.create",
    ACTION_UPDATE: "action.update",
    ACTION_PLAN_CREATE: "action_plan.create",
    ACTION_PLAN_UPDATE: "action_plan.update",
    ACTION_PLAN_ASSIGN: "action_plan.assign",
    ACTION_PLAN_FEEDBACK: "action_plan.feedback",

    // AI/ML
    AI_ANALYSIS_TRIGGER: "ai.analysis_trigger",
    AI_ANALYSIS_COMPLETE: "ai.analysis_complete",
    AI_ANALYSIS_FAILED: "ai.analysis_failed",
    AI_VISIBILITY_ANALYZE: "ai.visibility_analyze",
    AI_FEEDBACK_SUBMIT: "ai.feedback_submit",

    // Settings
    SETTING_UPDATE: "setting.update",
    NOTIFICATION_SETTING_UPDATE: "notification.setting_update",
    ESCALATION_MATRIX_UPDATE: "escalation.matrix_update",

    // Integrations
    INTEGRATION_CONNECT: "integration.connect",
    INTEGRATION_UPDATE: "integration.update",
    INTEGRATION_DISCONNECT: "integration.disconnect",

    // Ingestion
    INGESTION_START: "ingestion.start",
    INGESTION_COMPLETE: "ingestion.complete",
    INGESTION_FAILED: "ingestion.failed",
    INGESTION_CANCEL: "ingestion.cancel",
    INGESTION_WEBHOOK: "ingestion.webhook",

    // System
    SYSTEM_CONFIG_CHANGE: "system.config_change",
    SYSTEM_SECURITY_ALERT: "system.security_alert",
    SYSTEM_RATE_LIMIT_TRIGGERED: "system.rate_limit",
    SYSTEM_BACKUP: "system.backup",
};

/**
 * Sensitive fields that should be masked in audit logs
 */
const SENSITIVE_FIELDS = [
    "password",
    "passwordHash",
    "currentPassword",
    "newPassword",
    "confirmPassword",
    "token",
    "refreshToken",
    "accessToken",
    "apiKey",
    "secret",
    "privateKey",
    "authorization",
    "creditCard",
    "ssn",
    "taxId",
    "phone",
    "mobile",
    "email", // Mask in certain contexts
];

/**
 * Mask sensitive data in objects
 */
function maskSensitiveData(data) {
    if (!data || typeof data !== "object") {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(item => maskSensitiveData(item));
    }

    const masked = { ...data };

    for (const field of SENSITIVE_FIELDS) {
        if (field in masked) {
            const value = masked[field];
            if (typeof value === "string" && value.length > 4) {
                masked[field] = value.substring(0, 4) + "***MASKED***";
            } else {
                masked[field] = "***MASKED***";
            }
        }
    }

    // Also check nested objects
    for (const [key, value] of Object.entries(masked)) {
        if (typeof value === "object" && value !== null) {
            masked[key] = maskSensitiveData(value);
        }
    }

    return masked;
}

/**
 * Queue audit log entry for batch processing
 */
export async function recordAuditLog({
    event,
    userId = null,
    workspaceId = null,
    targetId = null,
    targetType = null,
    action = null,
    beforeState = null,
    afterState = null,
    metadata = {},
    req = null,
    skipDb = false,
}) {
    const entry = {
        id: generateAuditId(),
        timestamp: new Date().toISOString(),
        event,
        userId,
        workspaceId,
        targetId,
        targetType,
        action,
        beforeState: beforeState ? maskSensitiveData(beforeState) : null,
        afterState: afterState ? maskSensitiveData(afterState) : null,
        metadata: maskSensitiveData(metadata),
        ipAddress: req ? extractIP(req) : null,
        userAgent: req ? req.headers?.["user-agent"] : null,
        requestId: req?.id || null,
    };

    // Always log to structured logger
    logStructured("audit", event, {
        auditId: entry.id,
        userId,
        workspaceId,
        targetId,
        targetType,
        action,
        ipAddress: entry.ipAddress,
    });

    // Queue for batch database write
    if (!skipDb) {
        auditQueue.push(entry);

        // Flush if batch size reached
        if (auditQueue.length >= BATCH_SIZE) {
            await flushAuditQueue();
        } else if (!flushTimer) {
            // Set timer for periodic flush
            flushTimer = setTimeout(async () => {
                await flushAuditQueue();
            }, FLUSH_INTERVAL_MS);
        }
    }

    return entry;
}

/**
 * Flush audit queue to database
 */
async function flushAuditQueue() {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }

    if (auditQueue.length === 0) return;

    const batch = auditQueue.splice(0, BATCH_SIZE);

    try {
        // Import supabase here to avoid circular dependency
        const { default: supabase } = await import("./supabase.js");

        const { error } = await supabase
            .from("audit_logs")
            .insert(batch.map(entry => ({
                user_id: entry.userId,
                workspace_id: entry.workspaceId,
                event: entry.event,
                metadata: {
                    target_id: entry.targetId,
                    target_type: entry.targetType,
                    action: entry.action,
                    before_state: entry.beforeState,
                    after_state: entry.afterState,
                    ...entry.metadata,
                },
                ip_address: entry.ipAddress,
                user_agent: entry.userAgent,
                request_id: entry.requestId,
                created_at: entry.timestamp,
            })));

        if (error) {
            logStructured("error", "audit_batch_write_failed", {
                error: error.message,
                batchSize: batch.length,
            });
        } else {
            logStructured("debug", "audit_batch_write_success", {
                count: batch.length,
            });
        }
    } catch (error) {
        logStructured("error", "audit_flush_error", {
            error: error.message,
        });
    }
}

/**
 * Flush all pending audit logs (call on shutdown)
 */
export async function flushAllAuditLogs() {
    while (auditQueue.length > 0) {
        await flushAuditQueue();
    }
}

/**
 * Extract IP address from request
 */
function extractIP(req) {
    const forwarded = req.headers?.["x-forwarded-for"];
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || null;
}

/**
 * Generate unique audit log ID
 */
function generateAuditId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `aud_${timestamp}_${random}`;
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs({
    workspaceId,
    userId = null,
    event = null,
    startDate = null,
    endDate = null,
    limit = 100,
    offset = 0,
}) {
    try {
        const { default: supabase } = await import("./supabase.js");

        let query = supabase
            .from("audit_logs")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (userId) {
            query = query.eq("user_id", userId);
        }

        if (event) {
            query = query.eq("event", event);
        }

        if (startDate) {
            query = query.gte("created_at", startDate);
        }

        if (endDate) {
            query = query.lte("created_at", endDate);
        }

        const { data, error, count } = await query;

        if (error) {
            throw error;
        }

        return { data, count };
    } catch (error) {
        logStructured("error", "audit_query_failed", {
            error: error.message,
        });
        return { data: [], count: 0 };
    }
}

/**
 * Generate audit report for compliance
 */
export async function generateAuditReport({
    workspaceId,
    startDate,
    endDate,
    includeSensitive = false,
}) {
    const { data: logs } = await queryAuditLogs({
        workspaceId,
        startDate,
        endDate,
        limit: 10000,
    });

    const report = {
        generated: new Date().toISOString(),
        workspaceId,
        period: { start: startDate, end: endDate },
        summary: {
            totalEvents: logs.length,
            uniqueUsers: new Set(logs.map(l => l.user_id)).size,
            eventTypes: {},
        },
        events: logs,
    };

    // Count event types
    for (const log of logs) {
        const event = log.event;
        report.summary.eventTypes[event] = (report.summary.eventTypes[event] || 0) + 1;
    }

    // Sort by count
    report.summary.eventTypes = Object.fromEntries(
        Object.entries(report.summary.eventTypes).sort((a, b) => b[1] - a[1])
    );

    // Remove sensitive data unless explicitly requested
    if (!includeSensitive) {
        for (const log of report.events) {
            if (log.metadata) {
                log.metadata = maskSensitiveData(log.metadata);
            }
        }
    }

    return report;
}

/**
 * Helper to create audit-wrapped mutation
 * Automatically records before/after state
 */
export function auditMutation(event, getTargetId, options = {}) {
    return async function auditWrappedMutation(req, res, next) {
        const originalJson = res.json.bind(res);

        // Capture response before sending
        res.json = function(body) {
            // Record audit after successful mutation
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const targetId = typeof getTargetId === "function"
                    ? getTargetId(req, body)
                    : getTargetId;

                recordAuditLog({
                    event,
                    userId: req.user?.id,
                    workspaceId: req.user?.workspaceId || req.body?.workspaceId,
                    targetId,
                    targetType: options.targetType,
                    action: `${options.action || "mutate"}_${event}`,
                    beforeState: options.includeBefore ? res.locals?.beforeState : null,
                    afterState: body,
                    metadata: options.metadata || {},
                    req,
                });
            }

            return originalJson(body);
        };

        next();
    };
}

/**
 * Middleware wrapper for audit logging mutations
 */
export function auditMiddleware(event, options = {}) {
    return (req, res, next) => {
        // Record after response
        const originalEnd = res.end;
        let recorded = false;

        res.end = function(...args) {
            if (!recorded && (res.statusCode >= 200 && res.statusCode < 300)) {
                recorded = true;

                const targetId = options.getTargetId
                    ? (typeof options.getTargetId === "function"
                        ? options.getTargetId(req)
                        : options.getTargetId)
                    : req.params?.id || null;

                recordAuditLog({
                    event,
                    userId: req.user?.id,
                    workspaceId: req.user?.workspaceId,
                    targetId,
                    targetType: options.targetType,
                    action: options.action,
                    afterState: options.getState ? options.getState(req) : null,
                    metadata: {
                        method: req.method,
                        path: req.path,
                        query: req.query,
                        ...options.metadata,
                    },
                    req,
                });
            }

            return originalEnd.apply(this, args);
        };

        next();
    };
}

// Export for direct use
export { maskSensitiveData };
