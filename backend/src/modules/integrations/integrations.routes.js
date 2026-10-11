import express from "express";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
    listIntegrations,
    getIntegration,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    testIntegration,
} from "./integrations.controller.js";
import { wrapAsync } from "../../lib/sentry.js";
import { requireWorkspaceRole, MANAGER_ROLES } from "../../lib/workspace-access.js";
import {
    integrationsQuerySchema,
    createIntegrationBodySchema,
    updateIntegrationParamsSchema,
    updateIntegrationBodySchema,
    deleteIntegrationParamsSchema,
} from "./integrations.schema.js";

const router = express.Router();
router.use(verifyToken);

router.get("/", validateRequest({ query: integrationsQuerySchema }), listIntegrations);
router.get("/:id", validateRequest({ params: updateIntegrationParamsSchema, query: integrationsQuerySchema }), getIntegration);
router.post("/", validateRequest({ body: createIntegrationBodySchema }), requireWorkspaceRole(MANAGER_ROLES), createIntegration);
router.post(
    "/:id/test",
    validateRequest({ params: updateIntegrationParamsSchema }),
    testIntegration
);
router.patch(
    "/:id",
    validateRequest({ params: updateIntegrationParamsSchema, body: updateIntegrationBodySchema }),
    requireWorkspaceRole(MANAGER_ROLES),
    updateIntegration
);
router.delete(
    "/:id",
    validateRequest({ params: deleteIntegrationParamsSchema, query: integrationsQuerySchema }),
    requireWorkspaceRole(MANAGER_ROLES),
    deleteIntegration
);

export default router;
