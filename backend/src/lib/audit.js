import supabase from "./supabase.js";
import { logStructured } from "./logger.js";

export async function recordAuditLog({ userId = null, event, workspaceId = null, metadata = {} }) {
    if (!event) return;

    try {
        const isUuid = typeof userId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        const validUserId = isUuid ? userId : null;
        const actorId = isUuid ? null : userId;

        const { error } = await supabase
            .from("audit_logs")
            .insert({
                user_id: validUserId,
                workspace_id: workspaceId,
                event: event,
                metadata: {
                    ...metadata,
                    ...(actorId ? { actor_id: actorId } : {}),
                    ...(workspaceId ? { workspace_id: workspaceId } : {}),
                },
            });

        if (error) {
            throw error;
        }
    } catch (error) {
        logStructured("warn", "audit_log_write_failed", {
            event,
            userId,
            workspaceId,
            error: error?.message || "Unknown audit log error",
        });
    }
}
