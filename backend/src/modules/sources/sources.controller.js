import prisma from "../../prisma.js";

export const getSources = async (req, res) => {
    try {
        // Since we don't have workspaces fully integrated with user sessions yet,
        // we'll fetch all sources or assume a default workspace.
        // For MVP, we'll fetch all. In a real app we'd filter by workspaceId.
        const sources = await prisma.source.findMany();
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

        // Ideally, workspaceId comes from the active user's workspace
        // For MVP, if workspaceId is missing, we pick/create a default workspace
        let targetWorkspaceId = workspaceId;
        if (!targetWorkspaceId) {
            const defaultWorkspace = await prisma.workspace.findFirst();
            if (defaultWorkspace) {
                targetWorkspaceId = defaultWorkspace.id;
            } else {
                const newWorkspace = await prisma.workspace.create({
                    data: { name: "Default Workspace", slug: "default-workspace-" + Date.now() }
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
