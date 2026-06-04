import { z } from "zod";

export const workspaceSettingsQuerySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
});

const WORKSPACE_MEMBER_ROLES = ["owner", "admin", "analyst"];

export const updateWorkspaceSettingsBodySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
    brandName: z.string().trim().min(1, "brandName cannot be empty.").max(120, "brandName is too long.").optional().nullable(),
    industry: z.string().trim().min(1, "industry cannot be empty.").max(120, "industry is too long.").optional().nullable(),
    timezone: z.string().trim().min(1, "timezone cannot be empty.").max(80, "timezone is too long.").optional().nullable(),
    notificationEmail: z.string().trim().email("notificationEmail format is invalid.").optional().nullable(),
    whatsappPIC: z.string().trim().min(6, "whatsappPIC is too short.").max(32, "whatsappPIC is too long.").optional().nullable(),
}).refine((data) => {
    const updatableFields = ["brandName", "industry", "timezone", "notificationEmail", "whatsappPIC"];
    return updatableFields.some((key) => Object.prototype.hasOwnProperty.call(data, key));
}, {
    message: "At least one settings field must be provided.",
});

export const workspaceMembersQuerySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
});

export const createWorkspaceMemberBodySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
    userId: z.string().uuid("userId must be a valid UUID.").optional(),
    email: z.string().trim().email("email format is invalid.").optional(),
    name: z.string().trim().min(2, "name must be at least 2 characters.").max(120, "name is too long.").optional(),
    role: z.enum(WORKSPACE_MEMBER_ROLES, {
        errorMap: () => ({ message: `role must be one of: ${WORKSPACE_MEMBER_ROLES.join(", ")}` }),
    }),
}).refine((data) => Boolean(data.userId || data.email), {
    message: "Either userId or email is required.",
    path: ["userId"],
});

export const deleteWorkspaceMemberParamsSchema = z.object({
    id: z.string().uuid("id must be a valid UUID."),
});

export const deleteWorkspaceBodySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
    reason: z.string().trim().min(1, "reason is required.").max(300, "reason is too long."),
    confirmText: z.literal("DELETE_WORKSPACE", {
        errorMap: () => ({ message: "confirmText must be exactly DELETE_WORKSPACE." }),
    }),
});
