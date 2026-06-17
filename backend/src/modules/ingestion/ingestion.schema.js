import { z } from "zod";

export const triggerIngestionParamsSchema = z.object({
    sourceId: z.string().uuid("sourceId must be a valid UUID."),
});

export const batchTriggerIngestionBodySchema = z.object({
    sourceIds: z.array(z.string().uuid("sourceId must be a valid UUID.")).min(1, "sourceIds is required.").max(25, "sourceIds cannot exceed 25 items."),
});

export const cancelIngestionParamsSchema = z.object({
    jobId: z.string().uuid("jobId must be a valid UUID."),
});

export const cancelIngestionBodySchema = z.object({
    reason: z.string().trim().min(1, "reason is required.").max(300, "reason is too long."),
});
