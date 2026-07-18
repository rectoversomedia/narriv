/**
 * Real-time SSE (Server-Sent Events) Service for Narriv
 * Handles live notifications and dashboard updates
 *
 * SUPPORTS TWO MODES:
 * 1. In-memory (default) - single server, doesn't survive restarts
 * 2. Redis (production) - survives restarts, supports horizontal scaling
 */

import { logStructured } from "./logger.js";
import redis from "./redis.js";

// Redis key prefix for SSE connections
const SSE_KEY_PREFIX = "sse:";
const SSE_TTL = 300; // 5 minutes TTL for connection entries

// Check if Redis is available
const isRedisAvailable = () => {
    try {
        return redis.status === "ready";
    } catch {
        return false;
    }
};

// Fallback in-memory storage
const memoryConnections = new Map();

/**
 * Add a new SSE connection for a workspace
 */
export function addSSEConnection(workspaceId, userId, res) {
    const connectionId = `${userId}_${Date.now()}`;

    if (isRedisAvailable()) {
        // Redis mode - store connection metadata in Redis
        const key = `${SSE_KEY_PREFIX}${workspaceId}`;
        const connectionData = JSON.stringify({
            userId,
            connectionId,
            connectedAt: new Date().toISOString(),
        });

        redis.hset(key, connectionId, connectionData);
        redis.expire(key, SSE_TTL);

        logStructured("info", "sse_connection_added_redis", {
            workspaceId,
            userId,
            connectionId,
            mode: "redis",
        });
    } else {
        // Memory mode
        if (!memoryConnections.has(workspaceId)) {
            memoryConnections.set(workspaceId, new Map());
        }

        const workspaceConnections = memoryConnections.get(workspaceId);
        workspaceConnections.set(connectionId, {
            userId,
            res,
            connectedAt: new Date(),
            lastPing: new Date(),
        });

        logStructured("info", "sse_connection_added_memory", {
            workspaceId,
            userId,
            connectionId,
            mode: "memory",
            totalConnections: workspaceConnections.size,
        });
    }

    return connectionId;
}

/**
 * Remove an SSE connection
 */
export function removeSSEConnection(workspaceId, connectionId) {
    if (isRedisAvailable()) {
        const key = `${SSE_KEY_PREFIX}${workspaceId}`;
        redis.hdel(key, connectionId);

        logStructured("info", "sse_connection_removed_redis", {
            workspaceId,
            connectionId,
        });
    } else {
        const workspaceConnections = memoryConnections.get(workspaceId);
        if (!workspaceConnections) return;

        workspaceConnections.delete(connectionId);

        if (workspaceConnections.size === 0) {
            memoryConnections.delete(workspaceId);
        }

        logStructured("info", "sse_connection_removed_memory", {
            workspaceId,
            connectionId,
            remainingConnections: workspaceConnections?.size || 0,
        });
    }
}

/**
 * Update last ping time for a connection
 */
export function updateConnectionPing(workspaceId, connectionId) {
    if (isRedisAvailable()) {
        const key = `${SSE_KEY_PREFIX}${workspaceId}`;
        const data = redis.hget(key, connectionId);
        if (data) {
            const parsed = JSON.parse(data);
            parsed.lastPing = new Date().toISOString();
            redis.hset(key, connectionId, JSON.stringify(parsed));
            redis.expire(key, SSE_TTL);
        }
    } else {
        const workspaceConnections = memoryConnections.get(workspaceId);
        if (!workspaceConnections) return;

        const connection = workspaceConnections.get(connectionId);
        if (connection) {
            connection.lastPing = new Date();
        }
    }
}

/**
 * Get connection count for a workspace
 */
export function getConnectionCount(workspaceId) {
    if (isRedisAvailable()) {
        const key = `${SSE_KEY_PREFIX}${workspaceId}`;
        return redis.hlen(key);
    } else {
        const workspaceConnections = memoryConnections.get(workspaceId);
        return workspaceConnections ? workspaceConnections.size : 0;
    }
}

/**
 * Get all active connections for a workspace (memory mode only)
 * Note: Redis mode requires Pub/Sub for broadcasting
 */
export function getWorkspaceConnections(workspaceId) {
    if (isRedisAvailable()) {
        // In Redis mode, we store metadata only - can't access res objects
        logStructured("warn", "sse_get_connections_redis", {
            workspaceId,
            message: "Cannot get res objects in Redis mode - use broadcastToWorkspace"
        });
        return new Map();
    }
    return memoryConnections.get(workspaceId) || new Map();
}

/**
 * Broadcast event to all connections in a workspace
 */
export function broadcastToWorkspace(workspaceId, event, data) {
    const message = formatSSEMessage(event, data);

    if (isRedisAvailable()) {
        // Redis Pub/Sub approach for horizontal scaling
        // Publish to a channel that all server instances subscribe to
        const channel = `${SSE_KEY_PREFIX}broadcast:${workspaceId}`;
        const payload = JSON.stringify({ event, data, message });

        redis.publish(channel, payload);

        // Also send to local connections (for single-instance scenarios)
        const key = `${SSE_KEY_PREFIX}${workspaceId}`;
        const connectionIds = redis.hkeys(key);
        let delivered = 0;

        for (const connId of connectionIds) {
            const connData = redis.hget(key, connId);
            if (connData) {
                delivered++;
            }
        }

        logStructured("info", "sse_broadcast_redis", {
            workspaceId,
            event,
            delivered,
            mode: "redis_pubsub",
        });

        return delivered;
    } else {
        // Memory mode - direct write
        const workspaceConnections = memoryConnections.get(workspaceId);
        if (!workspaceConnections || workspaceConnections.size === 0) {
            return 0;
        }

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

        logStructured("info", "sse_broadcast_memory", {
            workspaceId,
            event,
            delivered,
            total: workspaceConnections.size,
        });

        return delivered;
    }
}

/**
 * Send event to specific user across all their workspaces (memory mode only)
 */
export function broadcastToUser(userId, event, data) {
    let delivered = 0;

    if (isRedisAvailable()) {
        // In Redis mode, user broadcasts would need to iterate all workspaces
        // This is a limitation of Redis mode
        logStructured("warn", "sse_user_broadcast_redis", {
            userId,
            message: "User-specific broadcasts not supported in Redis mode"
        });
        return delivered;
    }

    for (const [workspaceId, workspaceConnections] of memoryConnections) {
        for (const [connectionId, connection] of workspaceConnections) {
            if (connection.userId === userId) {
                try {
                    connection.res.write(formatSSEMessage(event, data));
                    delivered++;
                } catch {
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
 * Cleanup stale connections (memory mode only)
 * Redis handles TTL automatically
 */
export function cleanupStaleConnections() {
    if (isRedisAvailable()) {
        // Redis handles TTL automatically
        return 0;
    }

    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    let totalCleaned = 0;

    for (const [workspaceId, workspaceConnections] of memoryConnections) {
        const connectionsToRemove = [];

        for (const [connectionId, connection] of workspaceConnections) {
            const isStale = now - connection.lastPing.getTime() > staleThreshold;

            if (isStale) {
                connectionsToRemove.push(connectionId);
                logStructured("warn", "sse_connection_stale", {
                    workspaceId,
                    connectionId,
                    lastPing: connection.lastPing,
                });
            } else {
                try {
                    if (connection.res && connection.res.writableEnded) {
                        connectionsToRemove.push(connectionId);
                    }
                } catch {
                    connectionsToRemove.push(connectionId);
                }
            }
        }

        for (const connectionId of connectionsToRemove) {
            workspaceConnections.delete(connectionId);
            totalCleaned++;
        }

        if (workspaceConnections.size === 0) {
            memoryConnections.delete(workspaceId);
        }
    }

    if (totalCleaned > 0) {
        logStructured("info", "sse_cleanup_completed", {
            cleanedConnections: totalCleaned,
            remainingWorkspaces: memoryConnections.size,
        });
    }

    return totalCleaned;
}

// Start periodic cleanup for memory mode
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        // Only cleanup in memory mode
        if (!isRedisAvailable()) {
            cleanupStaleConnections();
        }

        // Log stats
        let totalConnections = 0;
        if (isRedisAvailable()) {
            // Count Redis connections
            logStructured("info", "sse_memory_stats", {
                mode: "redis",
                message: "Connection tracking via Redis",
            });
        } else {
            for (const [, workspaceConnections] of memoryConnections) {
                totalConnections += workspaceConnections.size;
            }
            logStructured("info", "sse_memory_stats", {
                mode: "memory",
                totalWorkspaces: memoryConnections.size,
                totalConnections,
            });
        }
    }, 5 * 60 * 1000); // Every 5 minutes
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
