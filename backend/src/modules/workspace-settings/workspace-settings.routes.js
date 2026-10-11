import express from "express";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
    createWorkspaceMember,
    deleteWorkspace,
    deleteWorkspaceMember,
    getWorkspaceSettings,
    listWorkspaceMembers,
    updateWorkspaceSettings
} from "./workspace-settings.controller.js";
import {
    createWorkspaceMemberBodySchema,
    deleteWorkspaceBodySchema,
    deleteWorkspaceMemberParamsSchema,
    updateWorkspaceSettingsBodySchema,
    workspaceMembersQuerySchema,
    workspaceSettingsQuerySchema
} from "./workspace-settings.schema.js";
import {
    getNotificationSettings,
    updateNotificationSettings,
} from "../notifications/notifications.controller.js";
import {
    notificationSettingsQuerySchema,
    updateNotificationSettingsBodySchema,
} from "../notifications/notifications.schema.js";
import { uploadWorkspaceLogo } from "./workspace-logo.controller.js";
import { uploadLogoBodySchema } from "./workspace-logo.schema.js";
import { getTokenUsageSummary } from "../../lib/token-tracking.js";
import { resolveWorkspaceIdForUser, requireWorkspaceRole, MANAGER_ROLES } from "../../lib/workspace-access.js";
import { wrapAsync } from "../../lib/sentry.js";

const router = express.Router();
router.use(verifyToken);

router.get("/settings", validateRequest({ query: workspaceSettingsQuerySchema }), getWorkspaceSettings);
router.patch("/settings", validateRequest({ body: updateWorkspaceSettingsBodySchema }), requireWorkspaceRole(MANAGER_ROLES), updateWorkspaceSettings);
router.get("/members", validateRequest({ query: workspaceMembersQuerySchema }), listWorkspaceMembers);
router.post("/members", validateRequest({ body: createWorkspaceMemberBodySchema }), requireWorkspaceRole(MANAGER_ROLES), createWorkspaceMember);
router.delete(
    "/members/:id",
    validateRequest({ params: deleteWorkspaceMemberParamsSchema, query: workspaceMembersQuerySchema }),
    requireWorkspaceRole(MANAGER_ROLES),
    deleteWorkspaceMember
);
router.delete(
    "/",
    validateRequest({ body: deleteWorkspaceBodySchema }),
    requireWorkspaceRole(MANAGER_ROLES),
    deleteWorkspace
);

// Notification Settings
router.get(
    "/notification-settings",
    validateRequest({ query: notificationSettingsQuerySchema }),
    getNotificationSettings
);
router.patch(
    "/notification-settings",
    validateRequest({ body: updateNotificationSettingsBodySchema }),
    requireWorkspaceRole(MANAGER_ROLES),
    updateNotificationSettings
);

// Logo Upload
router.post(
    "/logo",
    validateRequest({ body: uploadLogoBodySchema }),
    requireWorkspaceRole(MANAGER_ROLES),
    uploadWorkspaceLogo
);

// Token Usage
router.get("/token-usage", async (req, res) => {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }
        const days = parseInt(req.query.days) || 30;
        const summary = await getTokenUsageSummary(scopedWorkspaceId, days);
        return res.json(summary);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
