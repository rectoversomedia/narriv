import express from "express";
import { register, login, me, refresh, logout } from "./auth.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
    loginBodySchema,
    refreshBodySchema,
    registerBodySchema,
} from "./auth.schema.js";

const router = express.Router();

router.post("/register", validateRequest({ body: registerBodySchema }), register);
router.post("/login", validateRequest({ body: loginBodySchema }), login);
router.post("/refresh", validateRequest({ body: refreshBodySchema }), refresh);
router.post("/logout", logout);
router.get("/me", verifyToken, me);

export default router;
