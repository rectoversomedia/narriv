import prisma from "../prisma.js";
import { logStructured } from "./logger.js";

export async function recordAuditLog({ userId = null, event, workspaceId = null, metadata = {} }) {
    if (!event) return;

    try {
        await prisma.auditLog.create({
            data: {
                userId,
                event,
                metadata: {
                    ...metadata,
                    ...(workspaceId ? { workspaceId } : {}),
                },
            },
        });
    } catch (error) {
        logStructured("warn", "audit_log_write_failed", {
            event,
            userId,
            workspaceId,
            error: error?.message || "Unknown audit log error",
        });
    }
}
