import { z } from "zod";

export const analyzeBodySchema = z.object({
    title: z.string().trim().optional().nullable(),
    content: z.string().trim().min(1, "content cannot be empty.").optional(),
    text: z.string().trim().min(1, "text cannot be empty.").optional(),
}).refine((data) => Boolean(data.content || data.text), {
    message: "'content' field is required.",
    path: ["content"],
});

