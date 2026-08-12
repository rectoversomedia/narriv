import express from "express";
import { register, login, me, refresh, logout, changePassword, forgotPassword, verifyResetCode, resetPassword, verifyEmail, resendVerification, googleAuth, googleCallback, exchangeOAuthCode, demo } from "./auth.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { wrapAsync } from "../../lib/sentry.js";
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

router.post("/register", validateRequest({ body: registerBodySchema }), wrapAsync(register));
router.post("/login", validateRequest({ body: loginBodySchema }), wrapAsync(login));
router.post("/refresh", validateRequest({ body: refreshBodySchema }), wrapAsync(refresh));
router.post("/logout", validateRequest({ body: logoutBodySchema }), wrapAsync(logout));
router.post("/forgot-password", validateRequest({ body: forgotPasswordBodySchema }), wrapAsync(forgotPassword));
router.post("/verify-reset-code", validateRequest({ body: verifyResetCodeBodySchema }), wrapAsync(verifyResetCode));
router.post("/reset-password", validateRequest({ body: resetPasswordBodySchema }), wrapAsync(resetPassword));
router.post("/verify-email", validateRequest({ body: verifyEmailBodySchema }), wrapAsync(verifyEmail));
router.post("/resend-verification", validateRequest({ body: resendVerificationBodySchema }), wrapAsync(resendVerification));
router.post("/change-password", verifyToken, validateRequest({ body: changePasswordBodySchema }), wrapAsync(changePassword));
router.get("/me", verifyToken, wrapAsync(me));

// Demo endpoint for demo mode - creates a temporary demo session
router.post("/demo", wrapAsync(demo));

// OAuth Routes
router.get("/google", wrapAsync(googleAuth));
router.get("/google/callback", wrapAsync(googleCallback));
router.post("/oauth/exchange", wrapAsync(exchangeOAuthCode));

export default router;
