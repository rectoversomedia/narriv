import express from "express";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
    createWorkspaceMember,
    deleteWorkspaceMember,
    getWorkspaceSettings,
    listWorkspaceMembers,
    updateWorkspaceSettings
} from "./workspace-settings.controller.js";
import {
    createWorkspaceMemberBodySchema,
    deleteWorkspaceMemberParamsSchema,
    updateWorkspaceSettingsBodySchema,
    workspaceMembersQuerySchema,
    workspaceSettingsQuerySchema
} from "./workspace-settings.schema.js";

const router = express.Router();
router.use(verifyToken);

router.get("/settings", validateRequest({ query: workspaceSettingsQuerySchema }), getWorkspaceSettings);
router.patch("/settings", validateRequest({ body: updateWorkspaceSettingsBodySchema }), updateWorkspaceSettings);
router.get("/members", validateRequest({ query: workspaceMembersQuerySchema }), listWorkspaceMembers);
router.post("/members", validateRequest({ body: createWorkspaceMemberBodySchema }), createWorkspaceMember);
router.delete(
    "/members/:id",
    validateRequest({ params: deleteWorkspaceMemberParamsSchema, query: workspaceMembersQuerySchema }),
    deleteWorkspaceMember
);

export default router;
