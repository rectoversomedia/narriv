import { z } from "zod";

export const triggerIngestionParamsSchema = z.object({
    sourceId: z.string().uuid("sourceId must be a valid UUID."),
});

