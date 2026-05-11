import { z } from "zod";

export const alertIdParamsSchema = z.object({
    id: z.string().uuid("id must be a valid UUID."),
});

export const updateAlertStatusBodySchema = z.object({
    status: z.enum(["open", "acknowledged", "resolved"], {
        errorMap: () => ({ message: "status must be one of: open, acknowledged, resolved" }),
    }),
});

