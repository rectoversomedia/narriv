import prisma from "../prisma.js";

export const getUserWorkspaceIds = async (userId) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: { workspaceId: true },
  });

  return memberships.map((membership) => membership.workspaceId);
};

export const resolveWorkspaceIdForUser = async (userId, requestedWorkspaceId) => {
  if (requestedWorkspaceId) {
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: requestedWorkspaceId },
      select: { workspaceId: true },
    });

    return membership?.workspaceId || null;
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  });

  if (membership) {
    return membership.workspaceId;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: "My Workspace",
      slug: `workspace-${userId}-${Date.now()}`,
      members: {
        create: {
          userId,
          role: "admin",
        },
      },
    },
  });

  return workspace.id;
};
