import prisma from "../../prisma.js";

export const getSources = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find workspaces the user belongs to
        const memberships = await prisma.workspaceMember.findMany({
            where: { userId },
            select: { workspaceId: true }
        });
        const workspaceIds = memberships.map(m => m.workspaceId);

        const sources = await prisma.source.findMany({
            where: { workspaceId: { in: workspaceIds } }
        });

        res.json(sources);
    } catch (error) {
        console.error("Error fetching sources:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const createSource = async (req, res) => {
    try {
        const { name, type, workspaceId, actorId, inputConfig } = req.body;

        if (!name || !type) {
            return res.status(400).json({ error: "Name and type are required" });
        }

        const userId = req.user.id;

        // Ideally, workspaceId comes from the active user's workspace
        let targetWorkspaceId = workspaceId;
        if (!targetWorkspaceId) {
            const membership = await prisma.workspaceMember.findFirst({
                where: { userId }, // user's own workspace
                include: { workspace: true }
            });
            
            if (membership) {
                targetWorkspaceId = membership.workspaceId;
            } else {
                // Auto create workspace for new user
                const newWorkspace = await prisma.workspace.create({
                    data: {
                        name: "My Workspace",
                        slug: "workspace-" + userId + "-" + Date.now(),
                        members: {
                            create: {
                                userId,
                                role: "admin"
                            }
                        }
                    }
                });
                targetWorkspaceId = newWorkspace.id;
            }
        }

        const source = await prisma.source.create({
            data: {
                workspaceId: targetWorkspaceId,
                name,
                type,
                actorId: actorId || null,
                inputConfig: inputConfig || {}
            }
        });

        res.status(201).json(source);
    } catch (error) {
        console.error("Error creating source:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
