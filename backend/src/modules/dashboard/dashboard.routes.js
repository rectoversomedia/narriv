import express from "express";
import { getSummary } from "./dashboard.controller.js";

const router = express.Router();

router.get("/summary", getSummary);

export default router;
