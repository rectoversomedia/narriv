import prisma from "../../prisma.js";
import { forbidden, internalError } from "../../lib/api-error.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";

function toSafeDefaults(workspaceId) {
    return {
        workspaceId,
        brandName: null,
        industry: null,
        timezone: "UTC",
        notificationEmail: null,
        whatsappPIC: null,
        createdAt: null,
        updatedAt: null,
    };
}

export async function getWorkspaceSettings(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const settings = await prisma.workspaceSettings.findUnique({
            where: { workspaceId: scopedWorkspaceId },
        });

        if (!settings) {
            return res.json(toSafeDefaults(scopedWorkspaceId));
        }

        return res.json(settings);
    } catch (error) {
        console.error("Error fetching workspace settings:", error);
        return internalError(res);
    }
}

export async function updateWorkspaceSettings(req, res) {
    try {
        const { workspaceId, brandName, industry, timezone, notificationEmail, whatsappPIC } = req.body;

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const updated = await prisma.workspaceSettings.upsert({
            where: { workspaceId: scopedWorkspaceId },
            update: {
                brandName,
                industry,
                timezone,
                notificationEmail,
                whatsappPIC,
            },
            create: {
                workspaceId: scopedWorkspaceId,
                brandName: brandName ?? null,
                industry: industry ?? null,
                timezone: timezone ?? "UTC",
                notificationEmail: notificationEmail ?? null,
                whatsappPIC: whatsappPIC ?? null,
            },
        });

        return res.json(updated);
    } catch (error) {
        console.error("Error updating workspace settings:", error);
        return internalError(res);
    }
}

