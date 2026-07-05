import supabase from "./supabase.js";
import { logStructured } from "./logger.js";

export async function recordAuditLog({ userId = null, event, workspaceId = null, metadata = {} }) {
    if (!event) return;

    try {
        const { error } = await supabase
            .from("audit_logs")
            .insert({
                user_id: userId,
                workspace_id: workspaceId,
                event: event,
                metadata: {
                    ...metadata,
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
