import prisma from "../../prisma.js";
import { badRequest, forbidden, internalError, notFound } from "../../lib/api-error.js";
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

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                event: "workspace_settings_updated",
                metadata: {
                    workspaceId: scopedWorkspaceId,
                    brandName: updated.brandName,
                    industry: updated.industry,
                    timezone: updated.timezone,
                    notificationEmail: updated.notificationEmail,
                    whatsappPIC: updated.whatsappPIC,
                }
            }
        });

        return res.json(updated);
    } catch (error) {
        console.error("Error updating workspace settings:", error);
        return internalError(res);
    }
}

export async function listWorkspaceMembers(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const members = await prisma.workspaceMember.findMany({
            where: { workspaceId: scopedWorkspaceId },
            orderBy: { createdAt: "asc" },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    }
                }
            }
        });

        return res.json({
            data: members.map((member) => ({
                id: member.id,
                workspaceId: member.workspaceId,
                userId: member.userId,
                role: member.role,
                createdAt: member.createdAt,
                user: member.user,
            }))
        });
    } catch (error) {
        console.error("Error listing workspace members:", error);
        return internalError(res);
    }
}

export async function createWorkspaceMember(req, res) {
    try {
        const { workspaceId, userId, role } = req.body;
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true }
        });
        if (!user) {
            return notFound(res, "User not found", "USER_NOT_FOUND");
        }

        const existing = await prisma.workspaceMember.findFirst({
            where: { workspaceId: scopedWorkspaceId, userId }
        });
        if (existing) {
            return badRequest(res, "User is already a member of this workspace", "DUPLICATE_MEMBERSHIP");
        }

        const member = await prisma.workspaceMember.create({
            data: {
                workspaceId: scopedWorkspaceId,
                userId,
                role,
            }
        });

        return res.status(201).json(member);
    } catch (error) {
        console.error("Error creating workspace member:", error);
        return internalError(res);
    }
}

export async function deleteWorkspaceMember(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const member = await prisma.workspaceMember.findFirst({
            where: {
                id: req.params.id,
                workspaceId: scopedWorkspaceId,
            }
        });

        if (!member) {
            return notFound(res, "Workspace member not found", "WORKSPACE_MEMBER_NOT_FOUND");
        }

        await prisma.workspaceMember.delete({ where: { id: member.id } });
        return res.json({ success: true });
    } catch (error) {
        console.error("Error deleting workspace member:", error);
        return internalError(res);
    }
}
