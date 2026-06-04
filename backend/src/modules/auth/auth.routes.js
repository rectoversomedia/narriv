import express from "express";
import { register, login, me, refresh, logout, changePassword, forgotPassword, verifyResetCode, resetPassword } from "./auth.controller.js";
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
} from "./auth.schema.js";

const router = express.Router();

router.post("/register", validateRequest({ body: registerBodySchema }), register);
router.post("/login", validateRequest({ body: loginBodySchema }), login);
router.post("/refresh", validateRequest({ body: refreshBodySchema }), refresh);
router.post("/logout", validateRequest({ body: logoutBodySchema }), logout);
router.post("/forgot-password", validateRequest({ body: forgotPasswordBodySchema }), forgotPassword);
router.post("/verify-reset-code", validateRequest({ body: verifyResetCodeBodySchema }), verifyResetCode);
router.post("/reset-password", validateRequest({ body: resetPasswordBodySchema }), resetPassword);
router.post("/change-password", verifyToken, validateRequest({ body: changePasswordBodySchema }), changePassword);
router.get("/me", verifyToken, me);

export default router;
