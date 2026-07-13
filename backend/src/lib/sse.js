/**
 * Real-time SSE (Server-Sent Events) Service for Narriv
 * Handles live notifications and dashboard updates
 */

import { logStructured } from "./logger.js";

// Store active SSE connections per workspace
const connections = new Map();

/**
 * Add a new SSE connection for a workspace
 */
export function addSSEConnection(workspaceId, userId, res) {
    if (!connections.has(workspaceId)) {
        connections.set(workspaceId, new Map());
    }

    const workspaceConnections = connections.get(workspaceId);
    const connectionId = `${userId}_${Date.now()}`;

    workspaceConnections.set(connectionId, {
        userId,
        res,
        connectedAt: new Date(),
        lastPing: new Date(),
    });

    logStructured("info", "sse_connection_added", {
        workspaceId,
        userId,
        connectionId,
        totalConnections: workspaceConnections.size,
    });

    return connectionId;
}

/**
 * Remove an SSE connection
 */
export function removeSSEConnection(workspaceId, connectionId) {
    const workspaceConnections = connections.get(workspaceId);
    if (!workspaceConnections) return;

    workspaceConnections.delete(connectionId);
    logStructured("info", "sse_connection_removed", {
        workspaceId,
        connectionId,
        remainingConnections: workspaceConnections.size,
    });

    // Clean up empty workspace
    if (workspaceConnections.size === 0) {
        connections.delete(workspaceId);
    }
}

/**
 * Update last ping time for a connection
 */
export function updateConnectionPing(workspaceId, connectionId) {
    const workspaceConnections = connections.get(workspaceId);
    if (!workspaceConnections) return;

    const connection = workspaceConnections.get(connectionId);
    if (connection) {
        connection.lastPing = new Date();
    }
}

/**
 * Get all active connections for a workspace
 */
export function getWorkspaceConnections(workspaceId) {
    return connections.get(workspaceId) || new Map();
}

/**
 * Get connection count for a workspace
 */
export function getConnectionCount(workspaceId) {
    const workspaceConnections = connections.get(workspaceId);
    return workspaceConnections ? workspaceConnections.size : 0;
}

/**
 * Broadcast event to all connections in a workspace
 */
export function broadcastToWorkspace(workspaceId, event, data) {
    const workspaceConnections = connections.get(workspaceId);
    if (!workspaceConnections || workspaceConnections.size === 0) {
        logStructured("debug", "sse_no_connections", { workspaceId, event });
        return 0;
    }

    const message = formatSSEMessage(event, data);
    let delivered = 0;

    for (const [connectionId, connection] of workspaceConnections) {
        try {
            connection.res.write(message);
            delivered++;
        } catch (error) {
            logStructured("error", "sse_broadcast_failed", {
                workspaceId,
                connectionId,
                error: error.message,
            });
            // Remove dead connection
            workspaceConnections.delete(connectionId);
        }
    }

    logStructured("info", "sse_broadcast", {
        workspaceId,
        event,
        delivered,
        total: workspaceConnections.size,
    });

    return delivered;
}

/**
 * Send event to specific user across all their workspaces
 */
export function broadcastToUser(userId, event, data) {
    let delivered = 0;

    for (const [workspaceId, workspaceConnections] of connections) {
        for (const [connectionId, connection] of workspaceConnections) {
            if (connection.userId === userId) {
                try {
                    connection.res.write(formatSSEMessage(event, data));
                    delivered++;
                } catch (error) {
                    workspaceConnections.delete(connectionId);
                }
            }
        }
    }

    return delivered;
}

/**
 * Format SSE message
 */
export function formatSSEMessage(event, data, id = null) {
    const eventId = id || `evt_${Date.now()}`;
    return `id: ${eventId}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Send heartbeat to keep connections alive
 */
export function sendHeartbeat(workspaceId) {
    const workspaceConnections = connections.get(workspaceId);
    if (!workspaceConnections) return;

    const heartbeat = formatSSEMessage("heartbeat", { timestamp: Date.now() });

    for (const [connectionId, connection] of workspaceConnections) {
        try {
            connection.res.write(heartbeat);
        } catch {
            workspaceConnections.delete(connectionId);
        }
    }
}

/**
 * Cleanup stale connections (no ping in 5 minutes)
 */
export function cleanupStaleConnections() {
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();

    for (const [workspaceId, workspaceConnections] of connections) {
        for (const [connectionId, connection] of workspaceConnections) {
            if (now - connection.lastPing.getTime() > staleThreshold) {
                logStructured("warn", "sse_connection_stale", {
                    workspaceId,
                    connectionId,
                    lastPing: connection.lastPing,
                });
                try {
                    connection.res.write(formatSSEMessage("timeout", { message: "Connection timed out" }));
                    connection.res.end();
                } catch {
                    // Ignore
                }
                workspaceConnections.delete(connectionId);
            }
        }

        // Clean up empty workspace
        if (workspaceConnections.size === 0) {
            connections.delete(workspaceId);
        }
    }
}

// Start periodic cleanup (every minute)
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupStaleConnections, 60 * 1000);
}

// Event types for documentation
export const SSE_EVENTS = {
    // Dashboard events
    DASHBOARD_REFRESH: "dashboard_refresh",
    DASHBOARD_UPDATE: "dashboard_update",

    // Signal events
    SIGNAL_CREATED: "signal.created",
    SIGNAL_ANALYZED: "signal.analyzed",
    SIGNAL_UPDATED: "signal.updated",

    // Alert events
    ALERT_CREATED: "alert.created",
    ALERT_UPDATED: "alert.updated",
    ALERT_STATUS_CHANGED: "alert.status_changed",
    ALERT_ESCALATED: "alert.escalated",

    // Action plan events
    ACTION_PLAN_CREATED: "action_plan.created",
    ACTION_PLAN_UPDATED: "action_plan.updated",

    // Report events
    REPORT_GENERATED: "report.generated",
    REPORT_EXPORTED: "report.exported",

    // System events
    NOTIFICATION: "notification",
    HEARTBEAT: "heartbeat",
    TIMEOUT: "timeout",
};

// Event payload builders
export function buildSignalCreatedPayload(signal) {
    return {
        type: SSE_EVENTS.SIGNAL_CREATED,
        data: {
            id: signal.id,
            title: signal.title,
            platform: signal.platform,
            sentiment: signal.sentiment,
            published_at: signal.published_at,
        },
    };
}

export function buildAlertCreatedPayload(alert) {
    return {
        type: SSE_EVENTS.ALERT_CREATED,
        data: {
            id: alert.id,
            title: alert.title,
            type: alert.type,
            severity: alert.severity,
            status: alert.status,
        },
    };
}

export function buildNotificationPayload(notification) {
    return {
        type: SSE_EVENTS.NOTIFICATION,
        data: notification,
    };
}

export default {
    addSSEConnection,
    removeSSEConnection,
    broadcastToWorkspace,
    broadcastToUser,
    getWorkspaceConnections,
    getConnectionCount,
    SSE_EVENTS,
    buildSignalCreatedPayload,
    buildAlertCreatedPayload,
    buildNotificationPayload,
};
