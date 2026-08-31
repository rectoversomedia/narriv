import express from "express";
import { inspectSchema, runMigration } from "./migrate.controller.js";

const router = express.Router();

// Inspect current DB schema (no auth for easy checking)
// GET /api/migrate/inspect
router.get("/inspect", inspectSchema);

// Run migration checks (requires ADMIN_SECRET header)
router.post("/check", runMigration);

export default router;
