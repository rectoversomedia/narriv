import { z } from "zod";

const passwordStrengthSchema = z
    .string({ error: (issue) => (issue.input === undefined ? "Password is required." : undefined) })
    .min(10, "Password must be at least 10 characters long.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number.")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one symbol.");

export const loginBodySchema = z.object({
    email: z
        .string({ error: (issue) => (issue.input === undefined ? "Email is required." : undefined) })
        .trim()
        .min(1, "Email is required.")
        .email("Email format is invalid."),
    password: z
        .string({ error: (issue) => (issue.input === undefined ? "Password is required." : undefined) })
        .min(1, "Password is required."),
});

export const registerBodySchema = z.object({
    name: z
        .string({ error: (issue) => (issue.input === undefined ? "Name is required." : undefined) })
        .trim()
        .min(1, "Name is required."),
    email: z
        .string({ error: (issue) => (issue.input === undefined ? "Email is required." : undefined) })
        .trim()
        .min(1, "Email is required.")
        .email("Email format is invalid."),
    password: passwordStrengthSchema,
});

// The frontend sends `refreshToken`; older clients send `refresh_token`.
// Both are accepted and normalized to `refreshToken`.
const refreshTokenBody = z
    .object({
        refreshToken: z.string().trim().min(1).optional(),
        refresh_token: z.string().trim().min(1).optional(),
    })
    .refine((b) => b.refreshToken || b.refresh_token, { message: "refreshToken is required.", path: ["refreshToken"] })
    .transform((b) => ({ refreshToken: b.refreshToken || b.refresh_token }));

export const refreshBodySchema = refreshTokenBody;

export const changePasswordBodySchema = z.object({
    currentPassword: z
        .string({ error: (issue) => (issue.input === undefined ? "currentPassword is required." : undefined) })
        .min(1, "currentPassword is required."),
    newPassword: passwordStrengthSchema,
});

export const forgotPasswordBodySchema = z.object({
    email: z
        .string({ error: (issue) => (issue.input === undefined ? "Email is required." : undefined) })
        .trim()
        .min(1, "Email is required.")
        .email("Email format is invalid."),
});

export const verifyResetCodeBodySchema = z.object({
    email: z
        .string({ error: (issue) => (issue.input === undefined ? "Email is required." : undefined) })
        .trim()
        .min(1, "Email is required.")
        .email("Email format is invalid."),
    code: z
        .string({ error: (issue) => (issue.input === undefined ? "code is required." : undefined) })
        .trim()
        .regex(/^\d{6}$/, "code must be a 6-digit code."),
});

export const verifyEmailBodySchema = z.object({
    email: z
        .string({ error: (issue) => (issue.input === undefined ? "Email is required." : undefined) })
        .trim()
        .min(1, "Email is required.")
        .email("Email format is invalid."),
    code: z
        .string({ error: (issue) => (issue.input === undefined ? "code is required." : undefined) })
        .trim()
        .regex(/^\d{6}$/, "code must be a 6-digit code."),
});

export const resendVerificationBodySchema = z.object({
    email: z
        .string({ error: (issue) => (issue.input === undefined ? "Email is required." : undefined) })
        .trim()
        .min(1, "Email is required.")
        .email("Email format is invalid."),
});

export const resetPasswordBodySchema = z.object({
    resetToken: z
        .string({ error: (issue) => (issue.input === undefined ? "resetToken is required." : undefined) })
        .trim()
        .min(32, "resetToken is invalid."),
    newPassword: passwordStrengthSchema,
});

export const logoutBodySchema = refreshTokenBody;
