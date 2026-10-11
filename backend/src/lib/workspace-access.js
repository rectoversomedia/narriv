import supabase from "./supabase.js";

export const DEMO_WORKSPACE_ID = "56bc14ee-5f16-4134-9828-a240f3c72240";

export const getUserWorkspaceIds = async (userId) => {
  if (!userId) return [];
  if (String(userId).startsWith("demo")) return [DEMO_WORKSPACE_ID];
  const { data: memberships, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching workspace memberships:", error);
    return [];
  }

  return memberships.map((membership) => membership.workspace_id);
};

export const resolveWorkspaceIdForUser = async (userId, requestedWorkspaceId) => {
  if (!userId) return null;
  const normalizedRequestedId = requestedWorkspaceId === "demo-workspace" ? DEMO_WORKSPACE_ID : requestedWorkspaceId;
  if (String(userId).startsWith("demo")) {
    // Demo sessions are pinned to the demo workspace; never honor a requested id.
    return DEMO_WORKSPACE_ID;
  }
  if (normalizedRequestedId) {
    const { data: membership, error } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .eq("workspace_id", requestedWorkspaceId)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Error checking workspace membership:", error);
    }

    return membership?.workspace_id || null;
  }

  // Get workspaces the user is a member of, prioritizing completed workspaces, then owner role
  const { data: memberships, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, created_at, workspaces(onboarding_completed)")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user workspace memberships:", error);
  }

  if (memberships && memberships.length > 0) {
    const sorted = [...memberships].sort((a, b) => {
      const aCompleted = a.workspaces?.onboarding_completed ? 1 : 0;
      const bCompleted = b.workspaces?.onboarding_completed ? 1 : 0;
      if (bCompleted !== aCompleted) return bCompleted - aCompleted;

      const aOwner = a.role === "owner" ? 1 : 0;
      const bOwner = b.role === "owner" ? 1 : 0;
      if (bOwner !== aOwner) return bOwner - aOwner;

      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    return sorted[0].workspace_id;
  }

  // Create a new workspace for the user
  const workspaceName = "My Workspace";
  const workspaceSlug = `workspace-${userId}-${Date.now()}`;

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({
      name: workspaceName,
      slug: workspaceSlug,
    })
    .select()
    .single();

  if (workspaceError) {
    console.error("Error creating workspace:", workspaceError);
    return null;
  }

  // Create the workspace membership for the user
  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      user_id: userId,
      workspace_id: workspace.id,
      role: "admin",
    });

  if (memberError) {
    console.error("Error creating workspace membership:", memberError);
  }

  return workspace.id;
};

export const resolveScopedWorkspaceIds = async (userId, requestedWorkspaceId) => {
  const allowedWorkspaceIds = await getUserWorkspaceIds(userId);
  if (!requestedWorkspaceId) return allowedWorkspaceIds;
  const targetId = requestedWorkspaceId === "demo-workspace" ? DEMO_WORKSPACE_ID : requestedWorkspaceId;
  if (allowedWorkspaceIds.includes(targetId)) return [targetId];
  return [];
};

// ---------------------------------------------------------------------------
// Role-based access control (server-side). Roles in use: owner, admin, analyst.
// Demo sessions have no membership row and therefore no management role.
// ---------------------------------------------------------------------------

export const MANAGER_ROLES = ["owner", "admin"];

/** The caller's role in a workspace, or null when not a member. */
export const getWorkspaceRole = async (userId, workspaceId) => {
  if (!userId || !workspaceId || String(userId).startsWith("demo")) return null;
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .limit(1);
  if (error) {
    console.error("Error resolving workspace role:", error);
    return null;
  }
  return data?.[0]?.role || null;
};

export const workspaceHasOwner = async (workspaceId) => {
  const { data } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("role", "owner")
    .limit(2);
  return (data || []).length;
};

/**
 * Express middleware: resolve the target workspace from body/query and require
 * one of `allowedRoles`. Sets req.workspaceRole and req.scopedWorkspaceId.
 */
export function requireWorkspaceRole(allowedRoles) {
  return async (req, res, next) => {
    try {
      const requested = req.body?.workspaceId ?? req.query?.workspaceId ?? null;
      const workspaceId = await resolveWorkspaceIdForUser(req.user?.id, requested);
      if (!workspaceId) {
        return res.status(403).json({ error: "Workspace access denied", code: "WORKSPACE_ACCESS_DENIED" });
      }
      const role = await getWorkspaceRole(req.user?.id, workspaceId);
      if (!role || !allowedRoles.includes(role)) {
        return res.status(403).json({ error: "You do not have permission to perform this action.", code: "INSUFFICIENT_ROLE" });
      }
      req.workspaceRole = role;
      req.scopedWorkspaceId = workspaceId;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
