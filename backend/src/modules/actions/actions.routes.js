import express from "express";
import prisma from "../../prisma.js";
import { generateActionPlan } from "./actions.service.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveScopedWorkspaceIds, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";

const router = express.Router();
router.use(verifyToken);

// POST /api/actions — Generate a new action plan
router.post("/", async (req, res) => {
    try {
        const { workspaceId, strategyType, alertId, clusterId } = req.body;

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const validTypes = ["pr_response", "content_strategy", "influencer_strategy", "crisis_response"];
        if (!strategyType || !validTypes.includes(strategyType)) {
            return res.status(400).json({
                error: `strategyType is required. Must be one of: ${validTypes.join(", ")}`
            });
        }

        const plan = await generateActionPlan({ workspaceId: scopedWorkspaceId, strategyType, alertId, clusterId });

        res.status(201).json(plan);
    } catch (error) {
        console.error("Error generating action plan:", error);
        res.status(500).json({ error: error.message || "Internal server error" });
    }
});

// GET /api/actions — List action plans
router.get("/", async (req, res) => {
    try {
        const { workspaceId } = req.query;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);
        if (scopedWorkspaceIds.length === 0) {
            return res.json({ data: [], meta: { page: 1, limit, total: 0 } });
        }
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;

        const safePage = Math.max(1, page);
        const safeLimit = Math.max(1, limit);
        const skip = (safePage - 1) * safeLimit;

        const whereClause = {};
        whereClause.workspaceId = { in: scopedWorkspaceIds };

        const [data, total] = await Promise.all([
            prisma.actionPlan.findMany({
                where: whereClause,
                skip,
                take: safeLimit,
                orderBy: { createdAt: "desc" },
                include: {
                    alert: { select: { title: true, severity: true } },
                    cluster: { select: { title: true, sentiment: true } }
                }
            }),
            prisma.actionPlan.count({ where: whereClause })
        ]);

        res.json({
            data: data.map(plan => ({
                id: plan.id,
                title: plan.title,
                alert: plan.alert,
                cluster: plan.cluster,
                createdAt: plan.createdAt
            })),
            meta: { page: safePage, limit: safeLimit, total }
        });
    } catch (error) {
        console.error("Error fetching action plans:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/actions/:id — Get full action plan with parsed options
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        const plan = await prisma.actionPlan.findUnique({
            where: { id },
            include: {
                alert: true,
                cluster: true,
                generatedAssets: true
            }
        });

        if (!plan || !scopedWorkspaceIds.includes(plan.workspaceId)) {
            return res.status(404).json({ error: "Action plan not found" });
        }

        // Parse the stored JSON option strings back into objects
        const parseOption = (raw) => {
            try { return JSON.parse(raw); } catch { return null; }
        };

        res.json({
            id: plan.id,
            title: plan.title,
            createdAt: plan.createdAt,
            alert: plan.alert,
            cluster: plan.cluster,
            options: {
                conservative: parseOption(plan.option1),
                balanced: parseOption(plan.option2),
                bold: parseOption(plan.option3)
            },
            generatedAssets: plan.generatedAssets
        });
    } catch (error) {
        console.error("Error fetching action plan:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
