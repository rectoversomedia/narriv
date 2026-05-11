import { z } from "zod";

export const triggerIngestionParamsSchema = z.object({
    sourceId: z.string().uuid("sourceId must be a valid UUID."),
});

export const cancelIngestionParamsSchema = z.object({
    jobId: z.string().uuid("jobId must be a valid UUID."),
});

export const cancelIngestionBodySchema = z.object({
    reason: z.string().trim().min(1, "reason is required.").max(300, "reason is too long."),
});
