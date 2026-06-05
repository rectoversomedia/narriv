import prisma from "../../prisma.js";
import { forbidden, internalError } from "../../lib/api-error.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";

export async function listActivityLogs(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { eventType, userId, dateFrom, dateTo, page, limit } = req.query;
        const skip = (page - 1) * limit;

        const where = {
            metadata: {
                path: ["workspaceId"],
                equals: scopedWorkspaceId,
            },
        };

        if (eventType) {
            where.event = eventType;
        }

        if (userId) {
            where.userId = userId;
        }

        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) where.createdAt.gte = new Date(dateFrom);
            if (dateTo) where.createdAt.lte = new Date(dateTo);
        }

        const [logs, total] = await Promise.all([
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
            meta: { page, limit, total, totalPages },
        });
    } catch (error) {
        logStructured("error", "Error listing activity logs:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}
