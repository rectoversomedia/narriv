import supabase from "../../lib/supabase.js";
import { badRequest, forbidden, internalError } from "../../lib/api-error.js";
import { isDemoWorkspace } from "../../lib/workspace-access.js";
import { logStructured } from "../../lib/logger.js";
import { recordAuditLog } from "../../lib/audit.js";

// Deleting an account is permanent: the person's own workspaces go with every record in them (the database cascades
// from workspaces), their seats in other people's workspaces are removed, and the user row is deleted so the same
// email can sign up again. A workspace someone else also owns is left to that owner.
export const DELETE_ACCOUNT_CONFIRM = "DELETE_ACCOUNT";

// Columns that point at a user without ON DELETE: cleared in workspaces that stay, or the user row cannot be deleted.
const USER_REFERENCES = [
  ["alerts", "assigned_to"],
  ["reports", "created_by"],
  ["action_plans", "assigned_to"],
  ["action_plans", "created_by"],
  ["cases", "assignee_id"],
];

const LOGO_BUCKET = "workspace-logos";

async function removeWorkspaceLogos(workspaceId) {
  try {
    const { data } = await supabase.storage.from(LOGO_BUCKET).list(workspaceId);
    const paths = (data || []).map((file) => `${workspaceId}/${file.name}`);
    if (paths.length) await supabase.storage.from(LOGO_BUCKET).remove(paths);
  } catch (error) {
    logStructured("warn", "account_delete_logo_cleanup_failed", { workspaceId, error: error?.message });
  }
}

/** Workspaces this account alone owns: deleted with the account. */
export async function workspacesOwnedSolelyBy(userId) {
  const { data: memberships, error } = await supabase.from("workspace_members").select("workspace_id, role").eq("user_id", userId);
  if (error) throw error;
  const owned = (memberships || []).filter((m) => m.role === "owner" && !isDemoWorkspace(m.workspace_id)).map((m) => m.workspace_id);
  const result = [];
  for (const workspaceId of owned) {
    const { count, error: countError } = await supabase
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("role", "owner")
      .neq("user_id", userId);
    if (countError) throw countError;
    if (!count) result.push(workspaceId);
  }
  return result;
}

export async function deleteAccount(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isDemo || String(userId).startsWith("demo")) {
      return forbidden(res, "The demo account cannot be deleted.", "DEMO_READ_ONLY");
    }
    if (req.body?.confirmText !== DELETE_ACCOUNT_CONFIRM) {
      return badRequest(res, `confirmText must be exactly ${DELETE_ACCOUNT_CONFIRM}.`, "CONFIRMATION_REQUIRED");
    }

    const workspaceIds = await workspacesOwnedSolelyBy(userId);

    // Recorded first: once the user row is gone the log keeps the event with the user cleared.
    await recordAuditLog({ userId, workspaceId: null, event: "account_deleted", metadata: { deleted_workspaces: workspaceIds } });

    for (const workspaceId of workspaceIds) {
      await removeWorkspaceLogos(workspaceId);
      const { error } = await supabase.from("workspaces").delete().eq("id", workspaceId);
      if (error) throw new Error(`workspace ${workspaceId}: ${error.message}`);
    }

    for (const [table, column] of USER_REFERENCES) {
      const { error } = await supabase.from(table).update({ [column]: null }).eq(column, userId);
      if (error) logStructured("warn", "account_delete_reference_clear_failed", { table, column, error: error.message });
    }

    const { error: userError } = await supabase.from("users").delete().eq("id", userId);
    if (userError) throw new Error(`user: ${userError.message}`);

    logStructured("info", "account_deleted", { userId, deletedWorkspaces: workspaceIds.length });
    return res.json({ success: true, deletedWorkspaces: workspaceIds.length });
  } catch (error) {
    logStructured("error", "account_delete_failed", { error: error?.message || error, stack: error?.stack });
    return internalError(res);
  }
}
