import express from "express";
import { getSources, createSource } from "./sources.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, getSources);
router.post("/", verifyToken, createSource);

export default router;
