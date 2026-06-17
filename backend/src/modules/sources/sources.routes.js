import express from "express";
import { bootstrapDefaultSources, createSource, deleteSource, getSourcePresets, getSources, updateSource } from "./sources.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { getWorkspaceSourceHealth, getSourceCoverage } from "../../lib/source-health.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
    createSourceBodySchema,
    bootstrapDefaultsBodySchema,
    sourcePresetsQuerySchema,
    updateSourceBodySchema,
    updateSourceParamsSchema,
} from "./sources.schema.js";

const router = express.Router();
router.use(verifyToken);

router.get("/", getSources);
router.post("/", validateRequest({ body: createSourceBodySchema }), createSource);
router.get("/presets", validateRequest({ query: sourcePresetsQuerySchema }), getSourcePresets);
router.post("/bootstrap-defaults", validateRequest({ body: bootstrapDefaultsBodySchema }), bootstrapDefaultSources);
router.patch(
    "/:sourceId",
    validateRequest({ params: updateSourceParamsSchema, body: updateSourceBodySchema }),
    updateSource
);
router.delete("/:sourceId", deleteSource);

// GET /sources/health — Get health status for all sources
router.get("/health", async (req, res) => {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }
        const health = await getWorkspaceSourceHealth(scopedWorkspaceId);
        return res.json(health);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /sources/coverage — Get source coverage metrics
router.get("/coverage", async (req, res) => {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }
        const coverage = await getSourceCoverage(scopedWorkspaceId);
        return res.json(coverage);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
