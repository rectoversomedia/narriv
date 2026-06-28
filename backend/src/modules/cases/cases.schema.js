import { z } from "zod";

export const casesQuerySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
    search: z.string().trim().max(200, "search is too long.").optional(),
    status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createCaseBodySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
    title: z.string().trim().min(1, "title is required.").max(200, "title is too long."),
    description: z.string().trim().max(2000, "description is too long.").optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional().default("medium"),
    sourceType: z.string().trim().max(50).optional(),
    sourceId: z.string().trim().max(100).optional(),
    assignedTo: z.string().trim().max(100).optional(),
    assignedTeam: z.string().trim().max(100).optional(),
    deadline: z.string().datetime().optional(),
});

export const updateCaseParamsSchema = z.object({
    id: z.string().uuid("id must be a valid UUID."),
});

export const updateCaseBodySchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    assignedTo: z.string().trim().max(100).optional().nullable(),
    assignedTeam: z.string().trim().max(100).optional().nullable(),
    deadline: z.string().datetime().optional().nullable(),
    resolution: z.string().trim().max(2000).optional().nullable(),
});

export const deleteCaseParamsSchema = z.object({
    id: z.string().uuid("id must be a valid UUID."),
});
