import { z } from "zod";

const notificationRuleSchema = z.object({
    id: z.string().trim().min(1).max(100),
    trigger: z.enum(["severity", "sentiment", "sla", "keyword"]),
    condition: z.string().trim().min(1).max(120),
    channels: z.array(z.string().trim().min(1).max(80)).max(10),
    enabled: z.boolean(),
}).strict();

export const notificationSettingsQuerySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
});

export const updateNotificationSettingsBodySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
    emailEnabled: z.boolean().optional(),
    whatsappEnabled: z.boolean().optional(),
    escalationNotifications: z.boolean().optional(),
    reminderNotifications: z.boolean().optional(),
    customRules: z.array(notificationRuleSchema).max(20).optional(),
}).refine((data) => {
    const updatableFields = ["emailEnabled", "whatsappEnabled", "escalationNotifications", "reminderNotifications", "customRules"];
    return updatableFields.some((key) => Object.prototype.hasOwnProperty.call(data, key));
}, {
    message: "At least one notification settings field must be provided.",
});
