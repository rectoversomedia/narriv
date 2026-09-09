import supabase from "./supabase.js";

export const DEMO_WORKSPACE_ID = "4c77fd4b-7dc2-4a9b-be78-f9eee336e042";

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
    return normalizedRequestedId || DEMO_WORKSPACE_ID;
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

  // Get the first workspace the user is a member of
  const { data: membership, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching user workspace:", error);
  }

  if (membership) {
    return membership.workspace_id;
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
