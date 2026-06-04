import prisma from "../../prisma.js";
import { getUserWorkspaceIds } from "../../lib/workspace-access.js";
import { notificationEvents } from "./app-notifications.events.js";

// Fetch paginated notifications
export const getNotifications = async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];
        if (!workspaceId) return res.status(403).json({ error: "No workspace access" });

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const skip = (Math.max(1, page) - 1) * Math.max(1, limit);

        const [data, total, unreadCount] = await Promise.all([
            prisma.appNotification.findMany({
                where: { workspaceId },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.appNotification.count({ where: { workspaceId } }),
            prisma.appNotification.count({ where: { workspaceId, isRead: false } })
        ]);

        res.json({
            data,
            meta: {
                page,
                limit,
                total,
                unreadCount,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Mark single as read
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        
        const notification = await prisma.appNotification.findUnique({ where: { id } });
        if (!notification || !workspaceIds.includes(notification.workspaceId)) {
            return res.status(404).json({ error: "Notification not found" });
        }

        await prisma.appNotification.update({
            where: { id },
            data: { isRead: true }
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Error marking notification read:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Mark all as read
export const markAllAsRead = async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];
        if (!workspaceId) return res.status(403).json({ error: "No workspace access" });

        await prisma.appNotification.updateMany({
            where: { workspaceId, isRead: false },
            data: { isRead: true }
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Error marking all notifications read:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// SSE Stream endpoint
export const streamNotifications = async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];
        if (!workspaceId) return res.status(403).json({ error: "No workspace access" });

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        // Flush headers to establish connection
        res.flushHeaders();

        // Send initial connection heartbeat
        res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

        const listener = (notification) => {
            if (notification.workspaceId === workspaceId) {
                res.write(`data: ${JSON.stringify({ type: "new_notification", notification })}\n\n`);
            }
        };

        notificationEvents.on("new", listener);

        // Keep connection alive with a ping every 30 seconds
        const pingInterval = setInterval(() => {
            res.write(":\n\n"); // SSE comment as ping
        }, 30000);

        req.on("close", () => {
            clearInterval(pingInterval);
            notificationEvents.removeListener("new", listener);
            res.end();
        });

    } catch (error) {
        console.error("Error in SSE stream:", error);
        res.status(500).end();
    }
};

// Utility function to create and emit a notification (used internally by other modules)
export const createNotification = async ({ workspaceId, userId = null, type, title, message, link = null }) => {
    try {
        const notification = await prisma.appNotification.create({
            data: { workspaceId, userId, type, title, message, link }
        });
        
        // Emit to SSE listeners
        notificationEvents.emit("new", notification);
        return notification;
    } catch (error) {
        console.error("Error creating notification:", error);
        return null;
    }
};
