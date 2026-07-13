import express from "express";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
    createOnboardingWorkspace,
    createOnboardingSources,
    createOnboardingNotifications,
    createOnboardingTeam,
    createOnboardingKeywords,
    completeOnboarding,
    getSourceTemplates,
} from "./onboarding.controller.js";
import {
    onboardingWorkspaceBodySchema,
    onboardingSourcesBodySchema,
    onboardingNotificationsBodySchema,
    onboardingTeamBodySchema,
    onboardingKeywordsBodySchema,
    onboardingCompleteBodySchema,
} from "./onboarding.schema.js";

const router = express.Router();
router.use(verifyToken);

// Workspace setup
router.post("/workspace", validateRequest({ body: onboardingWorkspaceBodySchema }), createOnboardingWorkspace);

// Sources (with pre-configured Indonesia media pack)
router.post("/sources", validateRequest({ body: onboardingSourcesBodySchema }), createOnboardingSources);
router.get("/source-templates", getSourceTemplates);

// Keywords management
router.post("/keywords", validateRequest({ body: onboardingKeywordsBodySchema }), createOnboardingKeywords);

// Notifications
router.post("/notifications", validateRequest({ body: onboardingNotificationsBodySchema }), createOnboardingNotifications);

// Team
router.post("/team", validateRequest({ body: onboardingTeamBodySchema }), createOnboardingTeam);

// Complete onboarding & trigger ingestion
router.post("/complete", validateRequest({ body: onboardingCompleteBodySchema }), completeOnboarding);

export default router;
