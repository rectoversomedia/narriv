import { z } from "zod";

export const activityQuerySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
    eventType: z.string().trim().optional(),
    userId: z.string().uuid("userId must be a valid UUID.").optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
