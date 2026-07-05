import express from "express";
import supabase from "../../lib/supabase.js";
import { generateActionPlan, generateMultiStepPlan } from "./actions.service.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveScopedWorkspaceIds, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { badRequest, forbidden, internalError, notFound } from "../../lib/api-error.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { createActionPlanBodySchema } from "./actions.schema.js";
import { recordAuditLog } from "../../lib/audit.js";
import { logStructured } from "../../lib/logger.js";

const router = express.Router();
router.use(verifyToken);

// POST /api/actions — Generate a new action plan
router.post("/", validateRequest({ body: createActionPlanBodySchema }), async (req, res) => {
    try {
        const { workspaceId, strategyType, alertId, clusterId } = req.body;

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const validTypes = ["pr_response", "content_strategy", "influencer_strategy", "crisis_response", "social_response", "stakeholder_update", "data_driven"];
        if (!strategyType || !validTypes.includes(strategyType)) {
            return badRequest(
                res,
                `strategyType is required. Must be one of: ${validTypes.join(", ")}`,
                "INVALID_STRATEGY_TYPE"
            );
        }

        if (!process.env.OPENAI_API_KEY) {
            return res.status(503).json({
                error: "Action generation is currently unavailable.",
                code: "AI_PROVIDER_UNAVAILABLE",
                details: {
                    provider: "openai",
                    reason: "OPENAI_API_KEY is not configured",
                }
            });
        }

        const plan = await generateActionPlan({ workspaceId: scopedWorkspaceId, strategyType, alertId, clusterId });
        await recordAuditLog({
            userId: req.user.id,
            event: "action_plan_generated",
            workspaceId: scopedWorkspaceId,
            metadata: { actionPlanId: plan.id, strategyType, alertId, clusterId },
        });

        res.status(201).json(plan);
    } catch (error) {
        logStructured("error", "Error generating action plan:", { error: error?.message || error, stack: error?.stack });
        if (error?.message === "Alert not found" || error?.message === "Narrative cluster not found") {
            return notFound(res, error.message, "TARGET_NOT_FOUND");
        }
        return internalError(res, "Failed to generate action plan", "ACTION_GENERATION_FAILED", {
            reason: error?.message || "Unknown error",
        });
    }
});

// GET /api/actions — List action plans
router.get("/", async (req, res) => {
    try {
        const { workspaceId, search, priority, status } = req.query;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const safePage = Math.max(1, page);
        const safeLimit = Math.max(1, limit);
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);
        if (scopedWorkspaceIds.length === 0) {
            return res.json({ data: [], meta: { page: safePage, limit: safeLimit, total: 0 } });
        }
        const skip = (safePage - 1) * safeLimit;

        // Build query filters
        let query = supabase
            .from("action_plans")
            .select(`
                id,
                title,
                assigned_to,
                assigned_team,
                deadline,
                escalation_level,
                workflow_status,
                created_at,
                alert:alerts(title, severity),
                cluster:narrative_clusters(title, sentiment)
            `, { count: "exact" })
            .in("workspace_id", scopedWorkspaceIds)
            .order("created_at", { ascending: false })
            .range(skip, skip + safeLimit - 1);

        if (search && String(search).trim()) {
            const term = String(search).trim();
            query = query.or(`title.ilike.%${term}%,assigned_to.ilike.%${term}%,assigned_team.ilike.%${term}%`);
        }

        if (priority && priority !== "all") {
            const priorityValue = String(priority).toLowerCase();
            if (["low", "medium", "high", "critical"].includes(priorityValue)) {
                query = query.eq("escalation_level", priorityValue);
            }
        }

        if (status && status !== "all") {
            const normalizedStatus = String(status);
            if (normalizedStatus === "active") {
                query = query.or(`workflow_status.is.null,workflow_status.eq.todo,workflow_status.eq.active`);
            } else if (normalizedStatus === "in-progress") {
                query = query.in("workflow_status", ["in_progress", "blocked"]);
            } else {
                query = query.eq("workflow_status", normalizedStatus);
            }
        }

        const { data, error, count } = await query;

        if (error) throw error;

        res.json({
            data: (data || []).map(plan => ({
                id: plan.id,
                title: plan.title,
                alert: plan.alert,
                cluster: plan.cluster,
                assignedTo: plan.assigned_to,
                assignedTeam: plan.assigned_team,
                deadline: plan.deadline,
                escalationLevel: plan.escalation_level,
                workflowStatus: plan.workflow_status,
                createdAt: plan.created_at
            })),
            meta: { page: safePage, limit: safeLimit, total: count || 0 }
        });
    } catch (error) {
        logStructured("error", "Error fetching action plans:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/actions/:id — Get full action plan with parsed options
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        const { data: plan, error } = await supabase
            .from("action_plans")
            .select(`
                *,
                alert:alerts(*),
                cluster:narrative_clusters(*),
                generated_assets:generated_assets(*)
            `)
            .eq("id", id)
            .maybeSingle();

        if (error) throw error;

        if (!plan || !scopedWorkspaceIds.includes(plan.workspace_id)) {
            return res.status(404).json({ error: "Action plan not found" });
        }

        // Parse the stored JSON option strings back into objects
        const parseOption = (raw) => {
            try { return JSON.parse(raw); } catch { return null; }
        };

        res.json({
            id: plan.id,
            title: plan.title,
            createdAt: plan.created_at,
            alert: plan.alert,
            cluster: plan.cluster,
            options: {
                conservative: parseOption(plan.option1),
                balanced: parseOption(plan.option2),
                bold: parseOption(plan.option3)
            },
            generatedAssets: plan.generated_assets
        });
    } catch (error) {
        logStructured("error", "Error fetching action plan:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/actions/multi-step — Generate a multi-step sequential action plan
router.post("/multi-step", async (req, res) => {
    try {
        const { workspaceId, strategyType, alertId, clusterId, maxSteps } = req.body;

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const validTypes = ["pr_response", "content_strategy", "influencer_strategy", "crisis_response", "social_response", "stakeholder_update", "data_driven"];
        if (!strategyType || !validTypes.includes(strategyType)) {
            return badRequest(
                res,
                `strategyType is required. Must be one of: ${validTypes.join(", ")}`,
                "INVALID_STRATEGY_TYPE"
            );
        }

        if (!process.env.OPENAI_API_KEY) {
            return res.status(503).json({
                error: "Action generation is currently unavailable.",
                code: "AI_PROVIDER_UNAVAILABLE",
            });
        }

        const plan = await generateMultiStepPlan({
            workspaceId: scopedWorkspaceId,
            strategyType,
            alertId,
            clusterId,
            maxSteps: Math.min(Math.max(parseInt(maxSteps) || 5, 2), 10),
        });
        await recordAuditLog({
            userId: req.user.id,
            event: "multi_step_action_plan_generated",
            workspaceId: scopedWorkspaceId,
            metadata: { actionPlanId: plan.id, strategyType, alertId, clusterId },
        });

        res.status(201).json(plan);
    } catch (error) {
        logStructured("error", "Error generating multi-step plan:", { error: error?.message || error, stack: error?.stack });
        return internalError(res, "Failed to generate multi-step plan", "MULTI_STEP_GENERATION_FAILED", {
            reason: error?.message || "Unknown error",
        });
    }
});

export default router;
