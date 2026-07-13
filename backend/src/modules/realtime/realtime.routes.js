/**
 * Real-time SSE (Server-Sent Events) Routes for Narriv
 * Handles live dashboard updates and notifications
 */

import express from "express";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { getUserWorkspaceIds, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import {
    addSSEConnection,
    removeSSEConnection,
    updateConnectionPing,
    getConnectionCount,
    formatSSEMessage,
    SSE_EVENTS,
} from "../../lib/sse.js";
import { logStructured } from "../../lib/logger.js";

const router = express.Router();

// Track connection cleanup intervals
const cleanupIntervals = new Map();

/**
 * GET /api/realtime/stream
 * SSE endpoint for real-time updates
 */
router.get("/stream", verifyToken, async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];

        // Set SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

        // Send initial connection event
        res.write(formatSSEMessage("connected", {
            message: "Connected to Narriv real-time stream",
            workspaceId,
            userId: req.user.id,
            timestamp: Date.now()
        }));

        // Add connection
        const connectionId = addSSEConnection(workspaceId, req.user.id, res);

        logStructured("info", "sse_stream_connected", {
            userId: req.user.id,
            workspaceId,
            connectionId,
            connectionCount: getConnectionCount(workspaceId)
        });

        // Send heartbeat every 30 seconds
        const heartbeatInterval = setInterval(() => {
            try {
                res.write(formatSSEMessage("heartbeat", {
                    timestamp: Date.now()
                }));
                updateConnectionPing(workspaceId, connectionId);
            } catch (error) {
                clearInterval(heartbeatInterval);
            }
        }, 30000);

        // Store interval for cleanup
        cleanupIntervals.set(connectionId, heartbeatInterval);

        // Handle client disconnect
        req.on("close", () => {
            clearInterval(heartbeatInterval);
            cleanupIntervals.delete(connectionId);
            removeSSEConnection(workspaceId, connectionId);

            logStructured("info", "sse_stream_disconnected", {
                userId: req.user.id,
                workspaceId,
                connectionId,
                connectionCount: getConnectionCount(workspaceId)
            });
        });

        req.on("error", (error) => {
            logStructured("error", "sse_stream_error", {
                userId: req.user.id,
                workspaceId,
                connectionId,
                error: error.message
            });
        });

    } catch (error) {
        logStructured("error", "sse_stream_init_error", {
            userId: req.user?.id,
            error: error.message
        });
        res.status(500).json({ error: "Failed to establish SSE connection" });
    }
});

/**
 * GET /api/realtime/status
 * Get real-time connection status
 */
router.get("/status", verifyToken, async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];

        const connectionCount = getConnectionCount(workspaceId);

        res.json({
            connected: true,
            workspaceId,
            activeConnections: connectionCount,
            timestamp: Date.now()
        });
    } catch (error) {
        logStructured("error", "sse_status_error", {
            error: error.message
        });
        res.status(500).json({ error: "Failed to get connection status" });
    }
});

/**
 * POST /api/realtime/broadcast
 * Internal endpoint to broadcast events (called by other modules)
 */
router.post("/broadcast", verifyToken, async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];
        const { event, data } = req.body;

        if (!event) {
            return res.status(400).json({ error: "Event type is required" });
        }

        const delivered = SSE_EVENTS[event]
            ? broadcastToWorkspaceFromImport(workspaceId, event, data)
            : 0;

        logStructured("info", "sse_broadcast_api", {
            userId: req.user.id,
            workspaceId,
            event,
            delivered
        });

        res.json({ delivered });
    } catch (error) {
        logStructured("error", "sse_broadcast_error", {
            error: error.message
        });
        res.status(500).json({ error: "Failed to broadcast" });
    }
});

// Helper function since we can't directly import broadcastToWorkspace
import { broadcastToWorkspace } from "../../lib/sse.js";
function broadcastToWorkspaceFromImport(workspaceId, event, data) {
    return broadcastToWorkspace(workspaceId, event, data);
}

export default router;
