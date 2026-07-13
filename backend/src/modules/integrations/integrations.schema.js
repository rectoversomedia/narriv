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

// Webhook schemas
export const webhookEventsEnum = z.enum([
    "signal.created",
    "signal.analyzed",
    "alert.created",
    "alert.status_changed",
    "alert.escalated",
    "action_plan.created",
    "action_plan.completed",
    "report.generated",
    "report.exported",
    "workspace.member_added",
    "workspace.member_removed",
]);

export const createWebhookBodySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
    url: z.string().url("A valid URL is required.").max(500),
    events: z.array(webhookEventsEnum).min(1, "At least one event is required."),
    description: z.string().max(255).optional(),
});

export const updateWebhookBodySchema = z.object({
    url: z.string().url("A valid URL is required.").max(500).optional(),
    events: z.array(webhookEventsEnum).min(1).optional(),
    description: z.string().max(255).optional().nullable(),
    is_active: z.boolean().optional(),
});

export const webhookIdParamsSchema = z.object({
    id: z.string().uuid("id must be a valid UUID."),
});

export const webhookQuerySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
});

export const webhookDeliveryQuerySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
    limit: z.coerce.number().min(1).max(100).optional().default(50),
});
