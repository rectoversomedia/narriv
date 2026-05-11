import express from "express";
import { triggerIngestion, getIngestionStatus, cancelIngestion } from "./ingestion.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
    cancelIngestionBodySchema,
    cancelIngestionParamsSchema,
    triggerIngestionParamsSchema
} from "./ingestion.schema.js";

const router = express.Router();

router.post(
    "/run/:sourceId",
    verifyToken,
    validateRequest({ params: triggerIngestionParamsSchema }),
    triggerIngestion
);
router.get("/status/:jobId", verifyToken, getIngestionStatus);
router.post(
    "/cancel/:jobId",
    verifyToken,
    validateRequest({ params: cancelIngestionParamsSchema, body: cancelIngestionBodySchema }),
    cancelIngestion
);

export default router;
