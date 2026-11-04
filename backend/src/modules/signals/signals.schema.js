import { z } from "zod";

export const createSignalBodySchema = z.object({
    content: z.string({ error: (issue) => (issue.input === undefined ? "'content' field is required." : undefined) }).trim().min(1, "'content' field is required."),
    sentiment: z.string().trim().optional().nullable(),
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
});

export const signalIdParamsSchema = z.object({
    id: z.string().uuid("id must be a valid UUID."),
});

