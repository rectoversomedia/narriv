import express from "express";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { getWorkspaceSettings, updateWorkspaceSettings } from "./workspace-settings.controller.js";
import { updateWorkspaceSettingsBodySchema, workspaceSettingsQuerySchema } from "./workspace-settings.schema.js";

const router = express.Router();
router.use(verifyToken);

router.get("/settings", validateRequest({ query: workspaceSettingsQuerySchema }), getWorkspaceSettings);
router.patch("/settings", validateRequest({ body: updateWorkspaceSettingsBodySchema }), updateWorkspaceSettings);

export default router;

