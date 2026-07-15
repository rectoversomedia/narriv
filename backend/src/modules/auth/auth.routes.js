import express from "express";
import { register, login, me, refresh, logout, changePassword, forgotPassword, verifyResetCode, resetPassword, verifyEmail, resendVerification, googleAuth, googleCallback, exchangeOAuthCode, demo } from "./auth.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
    changePasswordBodySchema,
    forgotPasswordBodySchema,
    loginBodySchema,
    logoutBodySchema,
    refreshBodySchema,
    registerBodySchema,
    resetPasswordBodySchema,
    verifyResetCodeBodySchema,
    verifyEmailBodySchema,
    resendVerificationBodySchema,
} from "./auth.schema.js";

const router = express.Router();

router.post("/register", validateRequest({ body: registerBodySchema }), register);
router.post("/login", validateRequest({ body: loginBodySchema }), login);
router.post("/refresh", validateRequest({ body: refreshBodySchema }), refresh);
router.post("/logout", validateRequest({ body: logoutBodySchema }), logout);
router.post("/forgot-password", validateRequest({ body: forgotPasswordBodySchema }), forgotPassword);
router.post("/verify-reset-code", validateRequest({ body: verifyResetCodeBodySchema }), verifyResetCode);
router.post("/reset-password", validateRequest({ body: resetPasswordBodySchema }), resetPassword);
router.post("/verify-email", validateRequest({ body: verifyEmailBodySchema }), verifyEmail);
router.post("/resend-verification", validateRequest({ body: resendVerificationBodySchema }), resendVerification);
router.post("/change-password", verifyToken, validateRequest({ body: changePasswordBodySchema }), changePassword);
router.get("/me", verifyToken, me);

// Demo endpoint for demo mode - creates a temporary demo session
router.post("/demo", demo);

// OAuth Routes
router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);
router.post("/oauth/exchange", exchangeOAuthCode);

export default router;
