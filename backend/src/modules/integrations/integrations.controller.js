import prisma from "../../prisma.js";
import { badRequest, forbidden, internalError, notFound } from "../../lib/api-error.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { logStructured } from "../../lib/logger.js";

export async function listIntegrations(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { platform, status } = req.query;

        const where = { workspaceId: scopedWorkspaceId };
        if (platform) where.platform = platform;
        if (status) where.status = status;

        const integrations = await prisma.integration.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });

        return res.json({ data: integrations });
    } catch (error) {
        logStructured("error", "Error listing integrations:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function getIntegration(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const integration = await prisma.integration.findFirst({
            where: { id: req.params.id, workspaceId: scopedWorkspaceId },
        });

        if (!integration) {
            return notFound(res, "Integration not found", "INTEGRATION_NOT_FOUND");
        }

        return res.json(integration);
    } catch (error) {
        logStructured("error", "Error getting integration:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function createIntegration(req, res) {
    try {
        const { workspaceId, name, platform, config } = req.body;

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const integration = await prisma.integration.create({
            data: {
                workspaceId: scopedWorkspaceId,
                name,
                platform,
                config: config || {},
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                workspaceId: scopedWorkspaceId,
                event: "integration_created",
                metadata: { workspaceId: scopedWorkspaceId, integrationId: integration.id, name, platform },
            },
        });

        return res.status(201).json(integration);
    } catch (error) {
        logStructured("error", "Error creating integration:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function updateIntegration(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.body.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const existing = await prisma.integration.findFirst({
            where: { id: req.params.id, workspaceId: scopedWorkspaceId },
        });

        if (!existing) {
            return notFound(res, "Integration not found", "INTEGRATION_NOT_FOUND");
        }

        const { workspaceId, ...updateData } = req.body;

        const updated = await prisma.integration.update({
            where: { id: req.params.id },
            data: updateData,
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                workspaceId: scopedWorkspaceId,
                event: "integration_updated",
                metadata: { workspaceId: scopedWorkspaceId, integrationId: updated.id, changes: updateData },
            },
        });

        return res.json(updated);
    } catch (error) {
        logStructured("error", "Error updating integration:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function deleteIntegration(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const existing = await prisma.integration.findFirst({
            where: { id: req.params.id, workspaceId: scopedWorkspaceId },
        });

        if (!existing) {
            return notFound(res, "Integration not found", "INTEGRATION_NOT_FOUND");
        }

        await prisma.integration.delete({ where: { id: req.params.id } });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                workspaceId: scopedWorkspaceId,
                event: "integration_deleted",
                metadata: { workspaceId: scopedWorkspaceId, integrationId: req.params.id },
            },
        });

        return res.json({ success: true });
    } catch (error) {
        logStructured("error", "Error deleting integration:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}
