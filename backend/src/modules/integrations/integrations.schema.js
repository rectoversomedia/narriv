import { z } from "zod";

export const integrationsQuerySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
    platform: z.string().trim().optional(),
    status: z.enum(["active", "inactive", "error"]).optional(),
});

export const createIntegrationBodySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
    name: z.string().trim().min(1, "name is required.").max(100, "name is too long."),
    platform: z.string().trim().min(1, "platform is required.").max(50, "platform is too long."),
    config: z.record(z.unknown()).optional(),
});

export const updateIntegrationParamsSchema = z.object({
    id: z.string().uuid("id must be a valid UUID."),
});

export const updateIntegrationBodySchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    status: z.enum(["active", "inactive", "error"]).optional(),
    config: z.record(z.unknown()).optional().nullable(),
});

export const deleteIntegrationParamsSchema = z.object({
    id: z.string().uuid("id must be a valid UUID."),
});
