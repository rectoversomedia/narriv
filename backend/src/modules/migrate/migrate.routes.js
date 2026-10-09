import express from "express";
import { inspectSchema, runMigration, execSql, seedSourceTemplates, checkAuth } from "./migrate.controller.js";
import { debugSchema } from "./debug.controller.js";
import { testUserInsert } from "./migrate.controller.js";

const router = express.Router();

// Every diagnostic/migration route touches the DB with the service-role key,
// so all of them require the x-admin-secret header (fails closed when ADMIN_SECRET is unset).
router.use((req, res, next) => {
    if (!checkAuth(req, res)) return;
    next();
});

// Inspect current DB schema
router.get("/inspect", testUserInsert);

// Debug: full schema + insert test
router.get("/debug-schema", debugSchema);

// Run migration checks (requires ADMIN_SECRET header)
router.post("/check", runMigration);

// Dry-run SQL (DDL cannot be executed via PostgREST)
router.post("/exec-sql", execSql);

// Seed source_templates (uses DML — PostgREST can do this)
router.post("/seed-sources", seedSourceTemplates);

export default router;
