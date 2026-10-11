import supabase from "../../lib/supabase.js";
import { forbidden, internalError } from "../../lib/api-error.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { logStructured } from "../../lib/logger.js";

function startOfDay(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

function endOfDay(value) {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
}

// Audit rows carry the workspace in workspace_id, or (legacy rows) in metadata.workspace_id.
// Workspace ids are validated UUIDs from resolveWorkspaceIdForUser, safe to embed in the filter.
const workspaceScopeFilter = (ws) => `workspace_id.eq.${ws},metadata->>workspace_id.eq.${ws}`;

function applyFilters(query, { ws, eventType, userId, from, to }) {
    let q = query.or(workspaceScopeFilter(ws));
    if (eventType) q = q.eq("event", eventType);
    if (userId) q = q.eq("user_id", userId);
    if (from) q = q.gte("created_at", from.toISOString());
    if (to) q = q.lte("created_at", to.toISOString());
    return q;
}

export async function listActivityLogs(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { eventType, userId, dateFrom, dateTo } = req.query;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const filters = {
            ws: scopedWorkspaceId,
            eventType,
            userId,
            from: dateFrom ? startOfDay(dateFrom) : null,
            to: dateTo ? endOfDay(dateTo) : null,
        };
        const todayStart = startOfDay(new Date());

        const [logsResult, summaryResult, todayResult] = await Promise.all([
            // No embed: production audit_logs has no FK to users, so actors are loaded separately.
            applyFilters(supabase.from("audit_logs").select("*", { count: "exact" }), filters)
                .order("created_at", { ascending: false })
                .range(skip, skip + limit - 1),
            // Distinct actors / event types over the filtered set (bounded scan).
            applyFilters(supabase.from("audit_logs").select("user_id, event"), filters).limit(5000),
            applyFilters(supabase.from("audit_logs").select("id", { count: "exact", head: true }), { ...filters, from: filters.from && filters.from > todayStart ? filters.from : todayStart }),
        ]);

        const queryError = logsResult.error || summaryResult.error || todayResult.error;
        if (queryError) {
            logStructured("error", "activity_logs_query_failed", { error: queryError.message });
            return internalError(res);
        }

        const logs = logsResult.data || [];
        const actorIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))];
        const { data: actors } = actorIds.length
            ? await supabase.from("users").select("id, name, email").in("id", actorIds)
            : { data: [] };
        const actorById = new Map((actors || []).map((u) => [u.id, u]));
        const total = logsResult.count ?? logs.length;
        const summaryRows = summaryResult.data || [];

        return res.json({
            data: logs.map((log) => ({
                id: log.id,
                user_id: log.user_id,
                user: actorById.get(log.user_id) || null,
                event: log.event,
                metadata: log.metadata,
                created_at: log.created_at,
            })),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                summary: {
                    actors: new Set(summaryRows.map((r) => r.user_id).filter(Boolean)).size,
                    today: todayResult.count || 0,
                    eventTypes: new Set(summaryRows.map((r) => r.event).filter(Boolean)).size,
                },
            },
        });
    } catch (error) {
        logStructured("error", "Error listing activity logs:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}
