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
    userId: z.string({ required_error: "userId is required." }).uuid("userId must be a valid UUID."),
    role: z.enum(WORKSPACE_MEMBER_ROLES, {
        errorMap: () => ({ message: `role must be one of: ${WORKSPACE_MEMBER_ROLES.join(", ")}` }),
    }),
});

export const deleteWorkspaceMemberParamsSchema = z.object({
    id: z.string().uuid("id must be a valid UUID."),
});
