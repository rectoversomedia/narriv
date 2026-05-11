import { z } from "zod";

export const createReportBodySchema = z.object({
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
    title: z.string().trim().min(1, "title cannot be empty.").optional(),
    periodStart: z.string().datetime("periodStart must be a valid ISO datetime.").optional().nullable(),
    periodEnd: z.string().datetime("periodEnd must be a valid ISO datetime.").optional().nullable(),
});

export const reportIdParamsSchema = z.object({
    id: z.string().uuid("id must be a valid UUID."),
});

export const createReportExportBodySchema = z.object({
    format: z.enum(["json", "pdf"]).optional(),
});

