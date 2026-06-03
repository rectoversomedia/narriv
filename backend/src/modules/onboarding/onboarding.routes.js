import express from "express";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
    createOnboardingWorkspace,
    createOnboardingSources,
    createOnboardingNotifications,
    createOnboardingTeam,
} from "./onboarding.controller.js";
import {
    onboardingWorkspaceBodySchema,
    onboardingSourcesBodySchema,
    onboardingNotificationsBodySchema,
    onboardingTeamBodySchema,
} from "./onboarding.schema.js";

const router = express.Router();
router.use(verifyToken);

router.post("/workspace", validateRequest({ body: onboardingWorkspaceBodySchema }), createOnboardingWorkspace);
router.post("/sources", validateRequest({ body: onboardingSourcesBodySchema }), createOnboardingSources);
router.post("/notifications", validateRequest({ body: onboardingNotificationsBodySchema }), createOnboardingNotifications);
router.post("/team", validateRequest({ body: onboardingTeamBodySchema }), createOnboardingTeam);

export default router;
