import { z } from "zod";

const passwordStrengthSchema = z
    .string({ required_error: "Password is required." })
    .min(10, "Password must be at least 10 characters long.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number.")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one symbol.");

export const loginBodySchema = z.object({
    email: z
        .string({ required_error: "Email is required." })
        .trim()
        .min(1, "Email is required.")
        .email("Email format is invalid."),
    password: z
        .string({ required_error: "Password is required." })
        .min(1, "Password is required."),
});

export const registerBodySchema = z.object({
    name: z
        .string({ required_error: "Name is required." })
        .trim()
        .min(1, "Name is required."),
    email: z
        .string({ required_error: "Email is required." })
        .trim()
        .min(1, "Email is required.")
        .email("Email format is invalid."),
    password: passwordStrengthSchema,
});

export const refreshBodySchema = z.object({
    refreshToken: z
        .string({ required_error: "refreshToken is required." })
        .trim()
        .min(1, "refreshToken is required."),
});

export const changePasswordBodySchema = z.object({
    currentPassword: z
        .string({ required_error: "currentPassword is required." })
        .min(1, "currentPassword is required."),
    newPassword: passwordStrengthSchema,
});

export const logoutBodySchema = z.object({
    refreshToken: z
        .string({ required_error: "refreshToken is required." })
        .trim()
        .min(1, "refreshToken is required."),
});
