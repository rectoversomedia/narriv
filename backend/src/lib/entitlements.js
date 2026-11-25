/**
 * What each plan includes (one source for the API, the app and the pricing page).
 *
 *   starter < pilot < intelligence < decision < command
 *
 * - A trial gets everything in Intelligence, so a client sees the full product before choosing.
 * - A workspace without a plan (made before plans, the team's demos) keeps everything.
 * - Add-ons opened by the team still count: settings.socialAuto (social media), settings.creatorAccess (influencers).
 * - The Narriv team (platform admins) is never limited (lib/platform-admin.js).
 */
import { baseSupabaseAdmin as db } from "./supabase.js";
import { isPlatformAdmin } from "./platform-admin.js";
import { resolveWorkspaceIdForUser } from "./workspace-access.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { trialExpired } from "./workspace-plan.js";

export const PLAN_ORDER = ["starter", "pilot", "intelligence", "decision", "command"];

/** feature → the lowest plan that includes it. */
export const FEATURES = {
    whatsapp_alerts: "pilot",
    ai_visibility: "pilot",
    forecast: "pilot",
    claim_check: "pilot",
    ask: "pilot",
    action_plans: "pilot",
    competitors: "intelligence",
    network: "intelligence",
    account_check: "intelligence",
    press_release: "intelligence",
    scheduled_reports: "intelligence",
    social_media: "intelligence",
    influencer: "decision",
    service_stages: "decision",
    white_label: "decision",
    escalation: "decision",
    integrations: "decision",
};

export const LIMITS = {
    starter: { users: 1, retentionDays: 30 },
    pilot: { users: 3, retentionDays: 90 },
    intelligence: { users: 10, retentionDays: 365 },
    decision: { users: 50, retentionDays: 365 },
    command: { users: null, retentionDays: null },
};

/** The plan whose features apply: trial → intelligence, none → command (legacy and demos keep everything). */
export function effectivePlan(settings = {}) {
    const plan = settings?.plan;
    if (!plan) return "command";
    if (plan === "trial") return "intelligence";
    return PLAN_ORDER.includes(plan) ? plan : "command";
}

export function hasFeature(settings, feature) {
    const need = FEATURES[feature];
    if (!need) return true;
    if (feature === "social_media" && settings?.socialAuto === true) return true;
    if (feature === "influencer" && settings?.creatorAccess === true) return true;
    return PLAN_ORDER.indexOf(effectivePlan(settings)) >= PLAN_ORDER.indexOf(need);
}

/** Everything the app needs to show the plan, its limits and which features are open. */
export function entitlementsFor(settings = {}, { admin = false } = {}) {
    const plan = effectivePlan(settings);
    const features = Object.fromEntries(Object.keys(FEATURES).map((f) => [f, admin || hasFeature(settings, f)]));
    return {
        plan: settings?.plan || null,
        effectivePlan: plan,
        trial: settings?.plan === "trial" ? { endsAt: settings?.trialEndsAt || null, expired: trialExpired(settings) } : null,
        features,
        requiredPlan: FEATURES,
        limits: admin ? { users: null, retentionDays: null } : LIMITS[plan],
        addons: { social: settings?.socialAuto === true, influencer: settings?.creatorAccess === true },
        unrestricted: admin,
    };
}

export async function workspaceSettings(workspaceId) {
    const { data } = await db.from("workspaces").select("settings").eq("id", workspaceId).maybeSingle();
    return data?.settings || {};
}

/**
 * Express guard: 403 PLAN_FEATURE_LOCKED when the selected workspace's plan does not include the feature.
 * Usable before a router's own verifyToken (it verifies the token itself when needed).
 */
export function requireFeature(feature, { methods = null } = {}) {
    const check = async (req, res, next) => {
        try {
            if (methods && !methods.includes(req.method)) return next();
            if (String(req.user?.id || "").startsWith("demo")) return next();
            if (await isPlatformAdmin(req.user.id)) return next();
            const workspaceId = await resolveWorkspaceIdForUser(req.user.id);
            if (!workspaceId) return next(); // the router answers "no workspace" itself
            const settings = await workspaceSettings(workspaceId);
            if (hasFeature(settings, feature)) return next();
            return res.status(403).json({
                error: "This feature is not part of your plan.",
                code: "PLAN_FEATURE_LOCKED",
                feature,
                requiredPlan: FEATURES[feature],
                plan: effectivePlan(settings),
            });
        } catch (err) {
            return next(err);
        }
    };
    return (req, res, next) => (req.user ? check(req, res, next) : verifyToken(req, res, () => check(req, res, next)));
}
