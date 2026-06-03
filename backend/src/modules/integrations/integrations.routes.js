import express from "express";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
    listIntegrations,
    getIntegration,
    createIntegration,
    updateIntegration,
    deleteIntegration,
} from "./integrations.controller.js";
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
router.post("/", validateRequest({ body: createIntegrationBodySchema }), createIntegration);
router.patch(
    "/:id",
    validateRequest({ params: updateIntegrationParamsSchema, body: updateIntegrationBodySchema }),
    updateIntegration
);
router.delete(
    "/:id",
    validateRequest({ params: deleteIntegrationParamsSchema, query: integrationsQuerySchema }),
    deleteIntegration
);

export default router;
