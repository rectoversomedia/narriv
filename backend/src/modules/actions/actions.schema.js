import { z } from "zod";

const STRATEGY_TYPES = ["pr_response", "content_strategy", "influencer_strategy", "crisis_response"];

export const createActionPlanBodySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
    strategyType: z.enum(STRATEGY_TYPES, {
        errorMap: () => ({ message: `strategyType must be one of: ${STRATEGY_TYPES.join(", ")}` }),
    }),
    alertId: z.string().uuid("alertId must be a valid UUID.").optional().nullable(),
    clusterId: z.string().uuid("clusterId must be a valid UUID.").optional().nullable(),
});

