import express from "express";
import { triggerIngestion } from "./ingestion.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/run/:sourceId", verifyToken, triggerIngestion);

export default router;
