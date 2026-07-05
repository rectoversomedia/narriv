import supabase from "./supabase.js";

export const getUserWorkspaceIds = async (userId) => {
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
  if (requestedWorkspaceId) {
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
  if (allowedWorkspaceIds.includes(requestedWorkspaceId)) return [requestedWorkspaceId];
  return [];
};
