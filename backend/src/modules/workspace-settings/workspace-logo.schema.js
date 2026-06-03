import { z } from "zod";

export const uploadLogoBodySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
    fileName: z.string().trim().min(1, "fileName is required.").max(255, "fileName is too long."),
    fileContent: z.string().min(1, "fileContent is required."),
    mimeType: z.enum(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"], {
        errorMap: () => ({ message: "mimeType must be one of: image/png, image/jpeg, image/jpg, image/webp, image/svg+xml" }),
    }),
});
