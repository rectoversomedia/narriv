import { z } from "zod";

const SOURCE_TYPES = ["news", "web", "forum", "social", "video", "podcast"];

const sourceTypeSchema = z.enum(SOURCE_TYPES, {
    errorMap: () => ({
        message: `Invalid source type. Must be one of: ${SOURCE_TYPES.join(", ")}.`,
    }),
});

const actorIdSchema = z
    .string()
    .trim()
    .min(1, "actorId cannot be empty.")
    .max(128, "actorId is too long (max 128 characters).")
    .regex(
        /^[A-Za-z0-9][A-Za-z0-9_~/-]*$/,
        "actorId format is invalid. Use letters, numbers, underscore, dash, slash, or tilde."
    );

const workspaceIdSchema = z
    .string()
    .uuid("workspaceId must be a valid UUID.");

export const createSourceBodySchema = z.object({
    name: z
        .string({ required_error: "name is required." })
        .trim()
        .min(1, "name is required."),
    type: sourceTypeSchema,
    workspaceId: workspaceIdSchema.optional(),
    actorId: actorIdSchema.optional().nullable(),
    inputConfig: z
        .object({})
        .passthrough()
        .optional(),
});

export const updateSourceParamsSchema = z.object({
    sourceId: z.string().uuid("sourceId must be a valid UUID."),
});

export const updateSourceBodySchema = z
    .object({
        name: z.string().trim().min(1, "name cannot be empty.").optional(),
        type: sourceTypeSchema.optional(),
        actorId: actorIdSchema.optional().nullable(),
        inputConfig: z.object({}).passthrough().optional(),
        isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided.",
        path: [],
    });

