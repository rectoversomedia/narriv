import prisma from "../../prisma.js";
import { getUserWorkspaceIds, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { invalidateWorkspaceCache } from "../../lib/cache.js";

const VALID_SOURCE_TYPES = ["news", "web", "forum", "social", "video", "podcast"];

function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

export const getSources = async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceIds = await getUserWorkspaceIds(userId);
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 50));
        const skip = (page - 1) * limit;
        const type = req.query.type ? String(req.query.type).toLowerCase() : null;
        const isActive = req.query.isActive !== undefined ? String(req.query.isActive).toLowerCase() === "true" : null;
        const search = req.query.search ? String(req.query.search).trim() : null;

        const where = { workspaceId: { in: workspaceIds } };
        if (type) where.type = type;
        if (isActive !== null) where.isActive = isActive;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { actorId: { contains: search, mode: "insensitive" } },
            ];
        }

        const [sources, total] = await Promise.all([
            prisma.source.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" }
            }),
            prisma.source.count({ where })
        ]);

        res.json({
            data: sources,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
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
        const normalizedName = String(name).trim();
        const normalizedType = String(type).toLowerCase().trim();

        if (!normalizedName) {
            return res.status(400).json({ error: "Name cannot be empty" });
        }
        if (!VALID_SOURCE_TYPES.includes(normalizedType)) {
            return res.status(400).json({
                error: `Invalid source type. Must be one of: ${VALID_SOURCE_TYPES.join(", ")}`
            });
        }
        if (actorId !== undefined && actorId !== null && String(actorId).trim() === "") {
            return res.status(400).json({ error: "actorId cannot be empty string" });
        }
        if (inputConfig !== undefined && !isObject(inputConfig)) {
            return res.status(400).json({ error: "inputConfig must be an object" });
        }

        const userId = req.user.id;
        const targetWorkspaceId = await resolveWorkspaceIdForUser(userId, workspaceId);

        if (!targetWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const source = await prisma.source.create({
            data: {
                workspaceId: targetWorkspaceId,
                name: normalizedName,
                type: normalizedType,
                actorId: actorId ? String(actorId).trim() : null,
                inputConfig: inputConfig || {}
            }
        });

        await invalidateWorkspaceCache(targetWorkspaceId);
        res.status(201).json(source);
    } catch (error) {
        console.error("Error creating source:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const updateSource = async (req, res) => {
    try {
        const { sourceId } = req.params;
        const { name, type, actorId, inputConfig, isActive } = req.body;
        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        const existingSource = await prisma.source.findFirst({
            where: { id: sourceId, workspaceId: { in: workspaceIds } }
        });

        if (!existingSource) {
            return res.status(404).json({ error: "Source not found" });
        }

        const data = {};
        if (name !== undefined) data.name = name;
        if (type !== undefined) data.type = String(type).toLowerCase().trim();
        if (actorId !== undefined) data.actorId = actorId || null;
        if (inputConfig !== undefined) data.inputConfig = inputConfig || {};
        if (isActive !== undefined) data.isActive = Boolean(isActive);

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: "No source fields provided" });
        }

        if (data.name === "" || data.type === "") {
            return res.status(400).json({ error: "Name and type cannot be empty" });
        }
        if (data.type && !VALID_SOURCE_TYPES.includes(data.type)) {
            return res.status(400).json({
                error: `Invalid source type. Must be one of: ${VALID_SOURCE_TYPES.join(", ")}`
            });
        }
        if (inputConfig !== undefined && !isObject(inputConfig)) {
            return res.status(400).json({ error: "inputConfig must be an object" });
        }

        const source = await prisma.source.update({
            where: { id: sourceId },
            data
        });

        await invalidateWorkspaceCache(existingSource.workspaceId);
        res.json(source);
    } catch (error) {
        console.error("Error updating source:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deleteSource = async (req, res) => {
    try {
        const { sourceId } = req.params;
        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        const existingSource = await prisma.source.findFirst({
            where: { id: sourceId, workspaceId: { in: workspaceIds } }
        });

        if (!existingSource) {
            return res.status(404).json({ error: "Source not found" });
        }

        const source = await prisma.source.update({
            where: { id: sourceId },
            data: { isActive: false }
        });

        await invalidateWorkspaceCache(existingSource.workspaceId);
        res.json(source);
    } catch (error) {
        console.error("Error deleting source:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
