import { z } from "zod";

export const notificationSettingsQuerySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
});

export const updateNotificationSettingsBodySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
    emailEnabled: z.boolean().optional(),
    whatsappEnabled: z.boolean().optional(),
    escalationNotifications: z.boolean().optional(),
    reminderNotifications: z.boolean().optional(),
}).refine((data) => {
    const updatableFields = ["emailEnabled", "whatsappEnabled", "escalationNotifications", "reminderNotifications"];
    return updatableFields.some((key) => Object.prototype.hasOwnProperty.call(data, key));
}, {
    message: "At least one notification settings field must be provided.",
});
