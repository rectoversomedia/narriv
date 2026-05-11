import { z } from "zod";

export const createSignalBodySchema = z.object({
    content: z.string({ required_error: "'content' field is required." }).trim().min(1, "'content' field is required."),
    sentiment: z.string().trim().optional().nullable(),
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
});

export const signalIdParamsSchema = z.object({
    id: z.string().uuid("id must be a valid UUID."),
});

