import express from "express";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { listActivityLogs } from "./activity.controller.js";
import { activityQuerySchema } from "./activity.schema.js";

const router = express.Router();
router.use(verifyToken);

router.get("/", validateRequest({ query: activityQuerySchema }), listActivityLogs);

export default router;
