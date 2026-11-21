import supabase from "../../lib/supabase.js";
import { demoWorkspaceIdFor, getUserWorkspaceIds } from "../../lib/workspace-access.js";
import { tr } from "../../lib/request-context.js";
import { notificationEvents, globalEvents } from "./app-notifications.events.js";
import { logStructured } from "../../lib/logger.js";

// Fetch paginated notifications
export const getNotifications = async (req, res) => {
    try {
        if (req.user?.isDemo) {
            // Demo sessions see notifications built from their own sample workspace (open alerts, plans, risky
            // issues), so every item opens a real page of the demo instead of a placeholder.
            const ws = demoWorkspaceIdFor(req.user.id);
            const [{ data: alerts }, { data: plans }] = await Promise.all([
                supabase.from("alerts").select("id, title, description, severity, created_at").eq("workspace_id", ws).in("status", ["open", "new", "acknowledged"]).order("created_at", { ascending: false }).limit(30),
                supabase.from("action_plans").select("id, title, status, created_at").eq("workspace_id", ws).order("created_at", { ascending: false }).limit(1),
            ]);
            const RANK = { critical: 0, high: 1, medium: 2, low: 3 };
            const sevWord = { critical: tr("Critical", "Kritis"), high: tr("High", "Tinggi"), medium: tr("Medium", "Sedang"), low: tr("Low", "Rendah") };
            const mockNotifications = [
                ...[...(alerts || [])].sort((x, y) => (RANK[x.severity] ?? 9) - (RANK[y.severity] ?? 9)).slice(0, 2).map((a, i) => ({
                    id: `demo-alert-${a.id}`, workspace_id: ws, type: "alert",
                    title: `${sevWord[a.severity] || tr("Alert", "Peringatan")}: ${a.title}`,
                    message: String(a.description || "").split(" · ")[0].slice(0, 140),
                    link: `/alerts/${a.id}`, is_read: i > 0, created_at: a.created_at,
                })),
                ...(plans || []).map((p) => ({
                    id: `demo-plan-${p.id}`, workspace_id: ws, type: "action_plan",
                    title: tr("Action plan ready for review", "Rencana aksi siap ditinjau"),
                    message: p.title, link: "/action-plans", is_read: false, created_at: p.created_at,
                })),
                {
                    id: "demo-radar", workspace_id: ws, type: "signal",
                    title: tr("Narriv Radar: today's risky stories", "Narriv Radar: isu berisiko hari ini"),
                    message: tr("The most dangerous stories with findings and next steps.", "Isu paling berbahaya beserta temuan dan langkahnya."),
                    link: "/feed", is_read: true, created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                },
            ].sort((x, y) => Date.parse(y.created_at) - Date.parse(x.created_at));

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

// SSE Stream endpoint. On Vercel a held-open stream bills the function for its whole lifetime (up to maxDuration,
// then the browser reconnects), so it answers 204 there and clients rely on polling.
export const streamNotifications = async (req, res) => {
    if (process.env.VERCEL) return res.status(204).end();
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
