import express from "express";
import { getSummary } from "./dashboard.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();
router.use(verifyToken);

router.get("/summary", getSummary);

export default router;
