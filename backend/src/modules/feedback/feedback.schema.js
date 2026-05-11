import { z } from "zod";

const FEEDBACK_ACTIONS = ["accepted", "edited", "rejected"];

export const submitFeedbackBodySchema = z.object({
    workspaceId: z.string({ required_error: "workspaceId is required." }).uuid("workspaceId must be a valid UUID."),
    targetType: z.string({ required_error: "targetType is required." }).trim().min(1, "targetType is required."),
    targetId: z.string({ required_error: "targetId is required." }).trim().min(1, "targetId is required."),
    action: z.enum(FEEDBACK_ACTIONS, {
        errorMap: () => ({ message: `action must be one of: ${FEEDBACK_ACTIONS.join(", ")}` }),
    }),
    originalOutput: z.any().optional().nullable(),
    editedOutput: z.any().optional().nullable(),
    reason: z.string().trim().max(1000, "reason is too long.").optional().nullable(),
    userId: z.string().uuid("userId must be a valid UUID.").optional().nullable(),
});

