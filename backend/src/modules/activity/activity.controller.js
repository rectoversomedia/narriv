import prisma from "../../prisma.js";
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
        OR: [
            { workspaceId: scopedWorkspaceId },
            {
                metadata: {
                    path: ["workspaceId"],
                    equals: scopedWorkspaceId,
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
            where.userId = userId;
        }

        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) where.createdAt.gte = startOfDay(dateFrom);
            if (dateTo) where.createdAt.lte = endOfDay(dateTo);
        }

        const todayRange = mergeTodayRange(where.createdAt);

        const [logs, total, actors, events, today] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
                include: {
                    user: {
                        select: { id: true, name: true, email: true },
                    },
                },
            }),
            prisma.auditLog.count({ where }),
            prisma.auditLog.groupBy({
                by: ["userId"],
                where,
                _count: { _all: true },
            }),
            prisma.auditLog.groupBy({
                by: ["event"],
                where,
                _count: { _all: true },
            }),
            todayRange ? prisma.auditLog.count({ where: { ...where, createdAt: todayRange } }) : Promise.resolve(0),
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.json({
            data: logs.map((log) => ({
                id: log.id,
                userId: log.userId,
                user: log.user,
                event: log.event,
                metadata: log.metadata,
                createdAt: log.createdAt,
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
