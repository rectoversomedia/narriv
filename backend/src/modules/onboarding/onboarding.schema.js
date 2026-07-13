import { z } from "zod";

export const onboardingWorkspaceBodySchema = z.object({
    brandName: z.string().trim().min(1, "brandName is required.").max(120, "brandName is too long."),
    industry: z.string().trim().min(1, "industry is required.").max(120, "industry is too long.").optional(),
    timezone: z.string().trim().min(1, "timezone is required.").max(80, "timezone is too long.").optional().default("Asia/Jakarta (GMT+7)"),
});

export const onboardingSourcesBodySchema = z.object({
    sources: z.array(z.object({
        name: z.string().trim().min(1, "Source name is required.").max(100, "Source name is too long."),
        type: z.string().trim().min(1, "Source type is required.").max(50, "Source type is too long."),
        actorId: z.string().trim().optional(),
        inputConfig: z.record(z.unknown()).optional(),
    })).min(1, "At least one source is required.").max(20, "Maximum 20 sources per onboarding."),
});

export const onboardingNotificationsBodySchema = z.object({
    emailEnabled: z.boolean().optional().default(true),
    whatsappEnabled: z.boolean().optional().default(false),
    escalationNotifications: z.boolean().optional().default(true),
    reminderNotifications: z.boolean().optional().default(true),
});

export const onboardingTeamBodySchema = z.object({
    members: z.array(z.object({
        email: z.string().email("Invalid email format."),
        role: z.enum(["admin", "analyst", "viewer"], {
            errorMap: () => ({ message: "role must be one of: admin, analyst, viewer" }),
        }),
    })).min(1, "At least one member is required.").max(10, "Maximum 10 members per onboarding."),
});

// Keywords onboarding schema
export const onboardingKeywordsBodySchema = z.object({
    keywords: z.array(z.string().trim().min(1).max(100)).min(1, "At least one keyword is required.").max(50, "Maximum 50 keywords."),
});

// Complete onboarding schema
export const onboardingCompleteBodySchema = z.object({
    workspaceId: z.string().uuid("Invalid workspace ID."),
    triggerIngestion: z.boolean().optional().default(true),
});
