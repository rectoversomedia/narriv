import express from "express";
import { inspectSchema, runMigration, execSql, seedSourceTemplates } from "./migrate.controller.js";
import { debugSchema } from "./debug.controller.js";

const router = express.Router();

// Inspect current DB schema (public, no auth)
router.get("/inspect", inspectSchema);

// Debug: full schema + insert test
router.get("/debug-schema", debugSchema);

// Run migration checks (requires ADMIN_SECRET header)
router.post("/check", runMigration);

// Dry-run SQL (DDL cannot be executed via PostgREST)
router.post("/exec-sql", execSql);

// Seed source_templates (uses DML — PostgREST can do this)
router.post("/seed-sources", seedSourceTemplates);

export default router;
