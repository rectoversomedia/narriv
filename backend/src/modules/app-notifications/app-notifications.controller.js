import supabase from "../../lib/supabase.js";
import { getUserWorkspaceIds } from "../../lib/workspace-access.js";
import { notificationEvents, globalEvents } from "./app-notifications.events.js";
import { logStructured } from "../../lib/logger.js";

// Fetch paginated notifications
export const getNotifications = async (req, res) => {
    try {
        if (req.user?.isDemo) {
            const mockNotifications = [
                {
                    id: "demo-notif-1",
                    workspace_id: "demo-workspace",
                    type: "alert",
                    title: "High Negative Spike Detected",
                    message: "Negative sentiment spiked by 42% on Twitter/X in the last 2 hours.",
                    link: "/alert-center",
                    is_read: false,
                    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
                },
                {
                    id: "demo-notif-2",
                    workspace_id: "demo-workspace",
                    type: "action_plan",
                    title: "Action Plan Ready for Review",
                    message: "AI generated an urgent response strategy for PR crisis mitigation.",
                    link: "/action-plans",
                    is_read: false,
                    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                },
                {
                    id: "demo-notif-3",
                    workspace_id: "demo-workspace",
                    type: "signal",
                    title: "Emerging Topic: AI Governance",
                    message: "New narrative cluster identified across 12 articles and posts.",
                    link: "/signals",
                    is_read: true,
                    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                },
            ];

            return res.json({
                data: mockNotifications,
                meta: {
                    page: 1,
                    limit: 20,
                    total: mockNotifications.length,
                    unreadCount: mockNotifications.filter(n => !n.is_read).length,
                    totalPages: 1
                }
            });
        }

        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];
        if (!workspaceId) return res.status(403).json({ error: "No workspace access" });

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const skip = (Math.max(1, page) - 1) * Math.max(1, limit);

        const [dataResult, totalResult, unreadResult] = await Promise.all([
            supabase
                .from("app_notifications")
                .select("*")
                .eq("workspace_id", workspaceId)
                .order("created_at", { ascending: false })
                .range(skip, skip + limit - 1),
            supabase
                .from("app_notifications")
                .select("id", { count: "exact", head: true })
                .eq("workspace_id", workspaceId),
            supabase
                .from("app_notifications")
                .select("id", { count: "exact", head: true })
                .eq("workspace_id", workspaceId)
                .eq("is_read", false),
        ]);

        const data = dataResult.data || [];
        const total = totalResult.count || 0;
        const unreadCount = unreadResult.count || 0;

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
        logStructured("error", "Error fetching notifications:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
};

// Mark single as read
export const markAsRead = async (req, res) => {
    try {
        if (req.user?.isDemo) {
            return res.json({ success: true });
        }

        const { id } = req.params;
        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        const { data: notification, error: findError } = await supabase
            .from("app_notifications")
            .select("workspace_id")
            .eq("id", id)
            .single();

        if (findError || !notification || !workspaceIds.includes(notification.workspace_id)) {
            return res.status(404).json({ error: "Notification not found" });
        }

        const { error: updateError } = await supabase
            .from("app_notifications")
            .update({ is_read: true })
            .eq("id", id);

        if (updateError) {
            logStructured("error", "Error marking notification read:", { error: updateError.message });
            return res.status(500).json({ error: "Internal server error" });
        }

        res.json({ success: true });
    } catch (error) {
        logStructured("error", "Error marking notification read:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
};

// Mark all as read
export const markAllAsRead = async (req, res) => {
    try {
        if (req.user?.isDemo) {
            return res.json({ success: true });
        }

        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];
        if (!workspaceId) return res.status(403).json({ error: "No workspace access" });

        const { error } = await supabase
            .from("app_notifications")
            .update({ is_read: true })
            .eq("workspace_id", workspaceId)
            .eq("is_read", false);

        if (error) {
            logStructured("error", "Error marking all notifications read:", { error: error.message });
            return res.status(500).json({ error: "Internal server error" });
        }

        res.json({ success: true });
    } catch (error) {
        logStructured("error", "Error marking all notifications read:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
};

// SSE Stream endpoint
export const streamNotifications = async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];
        // Demo users have no workspace — send graceful "demo mode" response and close
        if (!workspaceId) {
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "close");
            res.flushHeaders();
            res.write(`data: ${JSON.stringify({ type: "connected", demo: true, message: "Demo mode — no notifications stream" })}\n\n`);
            res.end();
            return;
        }

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        // Flush headers to establish connection
        res.flushHeaders();

        // Send initial connection heartbeat
        res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

        const listener = (notification) => {
            if (notification.workspace_id === workspaceId) {
                res.write(`data: ${JSON.stringify({ type: "new_notification", notification })}\n\n`);
            }
        };

        const dashboardListener = (eventWorkspaceId) => {
            if (eventWorkspaceId === workspaceId) {
                res.write(`data: ${JSON.stringify({ type: "dashboard_update" })}\n\n`);
            }
        };

        notificationEvents.on("new", listener);
        globalEvents.on("dashboard_update", dashboardListener);

        // Keep connection alive with a ping every 30 seconds
        const pingInterval = setInterval(() => {
            res.write(":\n\n"); // SSE comment as ping
        }, 30000);

        req.on("close", () => {
            clearInterval(pingInterval);
            notificationEvents.removeListener("new", listener);
            globalEvents.removeListener("dashboard_update", dashboardListener);
            res.end();
        });

    } catch (error) {
        logStructured("error", "Error in SSE stream:", { error: error?.message || error, stack: error?.stack });
        res.status(500).end();
    }
};

// Utility function to create and emit a notification (used internally by other modules)
export const createNotification = async ({ workspaceId, userId = null, type, title, message, link = null }) => {
    try {
        const { data: notification, error } = await supabase
            .from("app_notifications")
            .insert({
                workspace_id: workspaceId,
                user_id: userId,
                type: type,
                title: title,
                message: message,
                link: link
            })
            .select()
            .single();

        if (error) {
            logStructured("error", "Error creating notification:", { error: error.message });
            return null;
        }

        // Emit to SSE listeners
        notificationEvents.emit("new", notification);
        return notification;
    } catch (error) {
        logStructured("error", "Error creating notification:", { error: error?.message || error, stack: error?.stack });
        return null;
    }
};
