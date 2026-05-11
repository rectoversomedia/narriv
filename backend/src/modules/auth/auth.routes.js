import express from "express";
import { register, login, me, refresh, logout, changePassword } from "./auth.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
    changePasswordBodySchema,
    loginBodySchema,
    logoutBodySchema,
    refreshBodySchema,
    registerBodySchema,
} from "./auth.schema.js";

const router = express.Router();

router.post("/register", validateRequest({ body: registerBodySchema }), register);
router.post("/login", validateRequest({ body: loginBodySchema }), login);
router.post("/refresh", validateRequest({ body: refreshBodySchema }), refresh);
router.post("/logout", validateRequest({ body: logoutBodySchema }), logout);
router.post("/change-password", verifyToken, validateRequest({ body: changePasswordBodySchema }), changePassword);
router.get("/me", verifyToken, me);

export default router;
