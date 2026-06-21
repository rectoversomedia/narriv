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

export const generateReportBodySchema = z.object({
    templateKey: z.string().trim().min(1, "templateKey is required"),
    workspaceId: z.string().uuid("workspaceId must be a valid UUID.").optional(),
    dateRange: z.object({
        start: z.string().datetime("dateRange.start must be a valid ISO datetime."),
        end: z.string().datetime("dateRange.end must be a valid ISO datetime."),
    }).optional(),
}).strict();

export const sendReportEmailBodySchema = z.object({
    recipientEmail: z.string().trim().email("recipientEmail must be a valid email address."),
    subject: z.string().trim().min(1).optional(),
    body: z.string().trim().min(1).optional(),
}).strict();

export const createReportExportBodySchema = z.object({
    format: z.enum(["json", "pdf"]).optional(),
});


export const createReportTemplateSchema = z.object({
    name: z.string().trim().min(1, "name is required"),
    description: z.string().trim().optional().nullable(),
    format: z.string().trim().optional(),
    cadence: z.string().trim().optional(),
    sectionCount: z.number().int().min(1).optional()
}).strict();

export const updateReportTemplateSchema = z.object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional().nullable(),
    format: z.string().trim().optional(),
    cadence: z.string().trim().optional(),
    sectionCount: z.number().int().min(1).optional()
}).strict();


export const createReportScheduleSchema = z.object({
    templateKey: z.string().trim().min(1, "templateKey is required"),
    name: z.string().trim().min(1, "name is required"),
    cadence: z.enum(["daily", "weekly", "monthly"]).optional(),
    dayOfWeek: z.string().trim().optional().nullable(),
    timeOfDay: z.string().trim().optional(),
    enabled: z.boolean().optional()
}).strict();

export const updateReportScheduleSchema = z.object({
    templateKey: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional(),
    cadence: z.enum(["daily", "weekly", "monthly"]).optional(),
    dayOfWeek: z.string().trim().optional().nullable(),
    timeOfDay: z.string().trim().optional(),
    enabled: z.boolean().optional()
}).strict();
