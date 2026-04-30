import express from "express";
import { triggerIngestion, getIngestionStatus } from "./ingestion.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/run/:sourceId", verifyToken, triggerIngestion);
router.get("/status/:jobId", verifyToken, getIngestionStatus);

export default router;
