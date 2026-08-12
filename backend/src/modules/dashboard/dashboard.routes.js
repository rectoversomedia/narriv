import express from "express";
import { getSummary } from "./dashboard.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { wrapAsync } from "../../lib/sentry.js";

const router = express.Router();
router.use(verifyToken);

router.get("/summary", wrapAsync(getSummary));

export default router;
