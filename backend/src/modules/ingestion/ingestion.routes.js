import express from "express";
import { triggerIngestion, getIngestionStatus } from "./ingestion.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { triggerIngestionParamsSchema } from "./ingestion.schema.js";

const router = express.Router();

router.post(
    "/run/:sourceId",
    verifyToken,
    validateRequest({ params: triggerIngestionParamsSchema }),
    triggerIngestion
);
router.get("/status/:jobId", verifyToken, getIngestionStatus);

export default router;
