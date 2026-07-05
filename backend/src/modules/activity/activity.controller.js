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

function workspaceAuditScope(scopedWorkspaceId) {
    return {
        or: [
            { workspace_id: scopedWorkspaceId },
            {
                metadata: {
                    path: ["workspace_id"],
                    value: scopedWorkspaceId,
                },
            },
        ],
    };
}

function mergeTodayRange(createdAt = {}) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const lowerBound = createdAt.gte && createdAt.gte > todayStart ? createdAt.gte : todayStart;
    const upperBound = createdAt.lte && createdAt.lte < todayEnd ? createdAt.lte : todayEnd;

    if (lowerBound > upperBound) return null;
    return { gte: lowerBound, lte: upperBound };
}

export async function listActivityLogs(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { eventType, userId, dateFrom, dateTo, page, limit } = req.query;
        const skip = (page - 1) * limit;

        const where = workspaceAuditScope(scopedWorkspaceId);

        if (eventType) {
            where.event = eventType;
        }

        if (userId) {
            where.user_id = userId;
        }

        if (dateFrom || dateTo) {
            where.created_at = {};
            if (dateFrom) where.created_at.gte = startOfDay(dateFrom);
            if (dateTo) where.created_at.lte = endOfDay(dateTo);
        }

        const todayRange = mergeTodayRange(where.created_at);

        const [logsResult, totalResult, actorsResult, eventsResult, todayCount] = await Promise.all([
            supabase
                .from("audit_logs")
                .select("*, user:users(id, name, email)")
                .setHeader("Prefer", "count=exact")
                .match(where)
                .order("created_at", { ascending: false })
                .range(skip, skip + limit - 1),
            supabase.from("audit_logs").select("id", { count: "exact", head: true }).setHeader("Prefer", "count=exact").match(where),
            supabase.rpc("group_by_audit_logs_user_id", { p_where: where }),
            supabase.rpc("group_by_audit_logs_event", { p_where: where }),
            todayRange
                ? supabase.from("audit_logs").select("id", { count: "exact", head: true }).setHeader("Prefer", "count=exact").match({ ...where, created_at: todayRange })
                : Promise.resolve({ count: 0 }),
        ]);

        const logs = logsResult.data || [];
        const total = totalResult.count || 0;
        const actors = actorsResult.data || [];
        const events = eventsResult.data || [];
        const today = todayCount.count || 0;

        const totalPages = Math.ceil(total / limit);

        return res.json({
            data: logs.map((log) => ({
                id: log.id,
                user_id: log.user_id,
                user: log.user,
                event: log.event,
                metadata: log.metadata,
                created_at: log.created_at,
            })),
            meta: {
                page,
                limit,
                total,
                totalPages,
                summary: {
                    actors: actors.length,
                    today,
                    eventTypes: events.length,
                },
            },
        });
    } catch (error) {
        logStructured("error", "Error listing activity logs:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}
