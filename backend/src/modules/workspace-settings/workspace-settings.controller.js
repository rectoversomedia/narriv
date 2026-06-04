import prisma from "../../prisma.js";
import { badRequest, forbidden, internalError, notFound } from "../../lib/api-error.js";
import { recordAuditLog } from "../../lib/audit.js";
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
        const { workspaceId, userId, email, name, role } = req.body;
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : null;
        const user = await prisma.user.findUnique({
            where: userId ? { id: userId } : { email: normalizedEmail },
            select: { id: true, email: true, name: true }
        });
        if (!user) {
            return notFound(res, "User not found. Ask the user to sign up before adding them to this workspace.", "USER_NOT_FOUND", normalizedEmail ? { email: normalizedEmail } : undefined);
        }

        const existing = await prisma.workspaceMember.findFirst({
            where: { workspaceId: scopedWorkspaceId, userId: user.id }
        });
        if (existing) {
            return badRequest(res, "User is already a member of this workspace", "DUPLICATE_MEMBERSHIP");
        }

        const member = await prisma.workspaceMember.create({
            data: {
                workspaceId: scopedWorkspaceId,
                userId: user.id,
                role,
            }
        });

        await recordAuditLog({
            userId: req.user.id,
            event: "workspace_member_added",
            workspaceId: scopedWorkspaceId,
            metadata: { memberId: member.id, addedUserId: user.id, email: user.email || normalizedEmail, invitedName: name || null, role },
        });

        return res.status(201).json({ ...member, user });
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

export async function deleteWorkspace(req, res) {
    try {
        const { workspaceId, reason } = req.body;
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const counts = await prisma.$transaction([
            prisma.source.count({ where: { workspaceId: scopedWorkspaceId } }),
            prisma.ingestionJob.count({ where: { workspaceId: scopedWorkspaceId } }),
            prisma.rawDocument.count({ where: { workspaceId: scopedWorkspaceId } }),
            prisma.signal.count({ where: { workspaceId: scopedWorkspaceId } }),
            prisma.alert.count({ where: { workspaceId: scopedWorkspaceId } }),
            prisma.narrativeCluster.count({ where: { workspaceId: scopedWorkspaceId } }),
            prisma.report.count({ where: { workspaceId: scopedWorkspaceId } }),
            prisma.actionPlan.count({ where: { workspaceId: scopedWorkspaceId } }),
            prisma.generatedAsset.count({ where: { workspaceId: scopedWorkspaceId } }),
            prisma.aIVisibilityResult.count({ where: { workspaceId: scopedWorkspaceId } }),
            prisma.promptTestRun.count({ where: { workspaceId: scopedWorkspaceId } }),
            prisma.aIFeedback.count({ where: { workspaceId: scopedWorkspaceId } }),
        ]);

        const hasTenantData = counts.some((count) => count > 0);
        if (hasTenantData) {
            await prisma.auditLog.create({
                data: {
                    userId: req.user.id,
                    event: "workspace_delete_restricted",
                    metadata: {
                        workspaceId: scopedWorkspaceId,
                        reason,
                        dataCounts: {
                            sources: counts[0],
                            ingestionJobs: counts[1],
                            rawDocuments: counts[2],
                            signals: counts[3],
                            alerts: counts[4],
                            narrativeClusters: counts[5],
                            reports: counts[6],
                            actionPlans: counts[7],
                            generatedAssets: counts[8],
                            visibilityResults: counts[9],
                            promptTestRuns: counts[10],
                            aiFeedback: counts[11],
                        }
                    }
                }
            });

            return res.status(409).json({
                error: "Workspace deletion is restricted because tenant data still exists.",
                code: "WORKSPACE_DELETE_RESTRICTED",
                details: {
                    workspaceId: scopedWorkspaceId,
                    rule: "restrict_delete",
                }
            });
        }

        await prisma.$transaction([
            prisma.workspaceSettings.deleteMany({ where: { workspaceId: scopedWorkspaceId } }),
            prisma.workspaceNotificationSettings.deleteMany({ where: { workspaceId: scopedWorkspaceId } }),
            prisma.workspaceMember.deleteMany({ where: { workspaceId: scopedWorkspaceId } }),
            prisma.workspace.delete({ where: { id: scopedWorkspaceId } }),
        ]);

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                event: "workspace_deleted",
                metadata: {
                    workspaceId: scopedWorkspaceId,
                    reason,
                    strategy: "restrict_delete",
                }
            }
        });

        return res.json({ success: true, workspaceId: scopedWorkspaceId });
    } catch (error) {
        console.error("Error deleting workspace:", error);
        return internalError(res);
    }
}
