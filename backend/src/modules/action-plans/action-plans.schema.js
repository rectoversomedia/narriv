import { z } from "zod";

const FEEDBACK_ACTIONS = ["accepted", "edited", "rejected"];

export const actionPlanIdParamsSchema = z.object({
    id: z.string().uuid("id must be a valid UUID."),
});

export const submitActionPlanFeedbackBodySchema = z.object({
    action: z.enum(FEEDBACK_ACTIONS, {
        errorMap: () => ({ message: `action must be one of: ${FEEDBACK_ACTIONS.join(", ")}` }),
    }),
    reason: z.string().trim().max(1000, "reason is too long.").optional().nullable(),
    comment: z.string().trim().max(1000, "comment is too long.").optional().nullable(),
    editedOutput: z.any().optional().nullable(),
    originalOutput: z.any().optional().nullable(),
    userId: z.string().uuid("userId must be a valid UUID.").optional().nullable(),
});

