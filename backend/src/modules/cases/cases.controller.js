import prisma from "../../prisma.js";
import { badRequest, forbidden, internalError, notFound } from "../../lib/api-error.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";

export async function listCases(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { status, priority, page, limit } = req.query;
        const skip = (page - 1) * limit;

        const where = { workspaceId: scopedWorkspaceId };
        if (status) where.status = status;
        if (priority) where.priority = priority;

        const [cases, total] = await Promise.all([
            prisma.case.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.case.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.json({
            data: cases,
            meta: { page, limit, total, totalPages },
        });
    } catch (error) {
        console.error("Error listing cases:", error);
        return internalError(res);
    }
}

export async function getCase(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const caseRecord = await prisma.case.findFirst({
            where: { id: req.params.id, workspaceId: scopedWorkspaceId },
        });

        if (!caseRecord) {
            return notFound(res, "Case not found", "CASE_NOT_FOUND");
        }

        return res.json(caseRecord);
    } catch (error) {
        console.error("Error getting case:", error);
        return internalError(res);
    }
}

export async function createCase(req, res) {
    try {
        const { workspaceId, title, description, priority, sourceType, sourceId, assignedTo, assignedTeam, deadline } = req.body;

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const caseRecord = await prisma.case.create({
            data: {
                workspaceId: scopedWorkspaceId,
                title,
                description: description || null,
                priority: priority || "medium",
                sourceType: sourceType || null,
                sourceId: sourceId || null,
                assignedTo: assignedTo || null,
                assignedTeam: assignedTeam || null,
                deadline: deadline ? new Date(deadline) : null,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                event: "case_created",
                metadata: { workspaceId: scopedWorkspaceId, caseId: caseRecord.id, title },
            },
        });

        return res.status(201).json(caseRecord);
    } catch (error) {
        console.error("Error creating case:", error);
        return internalError(res);
    }
}

export async function updateCase(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.body.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const existing = await prisma.case.findFirst({
            where: { id: req.params.id, workspaceId: scopedWorkspaceId },
        });

        if (!existing) {
            return notFound(res, "Case not found", "CASE_NOT_FOUND");
        }

        const { workspaceId, ...updateData } = req.body;
        if (updateData.deadline) updateData.deadline = new Date(updateData.deadline);

        const updated = await prisma.case.update({
            where: { id: req.params.id },
            data: updateData,
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                event: "case_updated",
                metadata: { workspaceId: scopedWorkspaceId, caseId: updated.id, changes: updateData },
            },
        });

        return res.json(updated);
    } catch (error) {
        console.error("Error updating case:", error);
        return internalError(res);
    }
}

export async function deleteCase(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const existing = await prisma.case.findFirst({
            where: { id: req.params.id, workspaceId: scopedWorkspaceId },
        });

        if (!existing) {
            return notFound(res, "Case not found", "CASE_NOT_FOUND");
        }

        await prisma.case.delete({ where: { id: req.params.id } });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                event: "case_deleted",
                metadata: { workspaceId: scopedWorkspaceId, caseId: req.params.id },
            },
        });

        return res.json({ success: true });
    } catch (error) {
        console.error("Error deleting case:", error);
        return internalError(res);
    }
}
