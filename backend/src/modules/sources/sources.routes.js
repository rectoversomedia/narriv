import express from "express";
import { createSource, deleteSource, getSources, updateSource } from "./sources.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, getSources);
router.post("/", verifyToken, createSource);
router.patch("/:sourceId", verifyToken, updateSource);
router.delete("/:sourceId", verifyToken, deleteSource);

export default router;
