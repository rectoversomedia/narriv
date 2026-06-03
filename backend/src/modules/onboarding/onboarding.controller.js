import prisma from "../../prisma.js";
import { badRequest, internalError, notFound } from "../../lib/api-error.js";

export async function createOnboardingWorkspace(req, res) {
    try {
        const { brandName, industry, timezone } = req.body;

        const workspace = await prisma.workspace.create({
            data: {
                name: brandName,
                slug: `workspace-${req.user.id}-${Date.now()}`,
                members: {
                    create: { userId: req.user.id, role: "admin" },
                },
                settings: {
                    create: {
                        brandName,
                        industry: industry || null,
                        timezone: timezone || "Asia/Jakarta (GMT+7)",
                    },
                },
                notificationSettings: {
                    create: {},
                },
            },
            include: {
                settings: true,
                notificationSettings: true,
                members: true,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                event: "onboarding_workspace_created",
                metadata: { workspaceId: workspace.id, brandName, industry },
            },
        });

        return res.status(201).json(workspace);
    } catch (error) {
        console.error("Error creating onboarding workspace:", error);
        return internalError(res);
    }
}

export async function createOnboardingSources(req, res) {
    try {
        const { sources } = req.body;
        const workspaceId = req.body.workspaceId;

        if (!workspaceId) {
            return badRequest(res, "workspaceId is required.", "WORKSPACE_ID_REQUIRED");
        }

        const membership = await prisma.workspaceMember.findFirst({
            where: { userId: req.user.id, workspaceId },
        });
        if (!membership) {
            return badRequest(res, "Workspace access denied.", "WORKSPACE_ACCESS_DENIED");
        }

        const created = await prisma.source.createMany({
            data: sources.map((source) => ({
                workspaceId,
                name: source.name,
                type: source.type,
                actorId: source.actorId || null,
                inputConfig: source.inputConfig || {},
                isActive: true,
            })),
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                event: "onboarding_sources_created",
                metadata: { workspaceId, count: created.count },
            },
        });

        return res.status(201).json({ count: created.count });
    } catch (error) {
        console.error("Error creating onboarding sources:", error);
        return internalError(res);
    }
}

export async function createOnboardingNotifications(req, res) {
    try {
        const { workspaceId, emailEnabled, whatsappEnabled, escalationNotifications, reminderNotifications } = req.body;

        if (!workspaceId) {
            return badRequest(res, "workspaceId is required.", "WORKSPACE_ID_REQUIRED");
        }

        const membership = await prisma.workspaceMember.findFirst({
            where: { userId: req.user.id, workspaceId },
        });
        if (!membership) {
            return badRequest(res, "Workspace access denied.", "WORKSPACE_ACCESS_DENIED");
        }

        const settings = await prisma.workspaceNotificationSettings.upsert({
            where: { workspaceId },
            update: {
                emailEnabled,
                whatsappEnabled,
                escalationNotifications,
                reminderNotifications,
            },
            create: {
                workspaceId,
                emailEnabled: emailEnabled ?? true,
                whatsappEnabled: whatsappEnabled ?? false,
                escalationNotifications: escalationNotifications ?? true,
                reminderNotifications: reminderNotifications ?? true,
            },
        });

        return res.json(settings);
    } catch (error) {
        console.error("Error creating onboarding notifications:", error);
        return internalError(res);
    }
}

export async function createOnboardingTeam(req, res) {
    try {
        const { members, workspaceId } = req.body;

        if (!workspaceId) {
            return badRequest(res, "workspaceId is required.", "WORKSPACE_ID_REQUIRED");
        }

        const membership = await prisma.workspaceMember.findFirst({
            where: { userId: req.user.id, workspaceId },
        });
        if (!membership) {
            return badRequest(res, "Workspace access denied.", "WORKSPACE_ACCESS_DENIED");
        }

        const results = [];
        for (const member of members) {
            const user = await prisma.user.findUnique({
                where: { email: member.email },
                select: { id: true },
            });

            if (!user) {
                results.push({ email: member.email, status: "user_not_found" });
                continue;
            }

            const existing = await prisma.workspaceMember.findFirst({
                where: { workspaceId, userId: user.id },
            });

            if (existing) {
                results.push({ email: member.email, status: "already_member" });
                continue;
            }

            await prisma.workspaceMember.create({
                data: {
                    workspaceId,
                    userId: user.id,
                    role: member.role,
                },
            });

            results.push({ email: member.email, status: "added", role: member.role });
        }

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                event: "onboarding_team_invited",
                metadata: { workspaceId, memberCount: members.length, results },
            },
        });

        return res.json({ results });
    } catch (error) {
        console.error("Error creating onboarding team:", error);
        return internalError(res);
    }
}
