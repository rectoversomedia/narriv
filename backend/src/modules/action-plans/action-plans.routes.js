import express from "express";
import prisma from "../../prisma.js";

const router = express.Router();

function parseOption(raw) {
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function buildActionPlanResponse(plan) {
    const balanced = parseOption(plan.option2) || parseOption(plan.option1) || parseOption(plan.option3) || {};
    const steps = Array.isArray(balanced.immediate_actions)
        ? balanced.immediate_actions
        : Array.isArray(balanced.key_messages)
            ? balanced.key_messages
            : [];

    const timelineSlots = ["Today", "Next 6h", "24h", "48h"];

    return {
        inputNarrative: balanced.executive_summary
            || plan.alert?.whatHappened
            || plan.cluster?.description
            || "",
        evidenceSummary: `Evidence: ${plan.cluster?.signalCount || 0} related findings · Severity: ${plan.alert?.severity || "medium"} · Status: ${plan.alert?.status || "open"}`,
        outputs: [
            ["Primary action", plan.title || "Action plan"],
            ["Channel", balanced.media_channels?.join(", ") || "Owned + PR"],
            ["Impact / effort", `${plan.alert?.severity === "high" ? "High" : "Medium"} impact · Medium effort`],
            ["Confidence", "82%"],
        ],
        plan: steps.slice(0, 4).map((step, index) => [step, timelineSlots[index] || "Later"]),
    };
}

// GET /api/action-plans — Frontend contract endpoint
router.get("/", async (req, res) => {
    try {
        const { workspaceId } = req.query;
        const whereClause = workspaceId ? { workspaceId } : {};

        const latestPlan = await prisma.actionPlan.findFirst({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            include: {
                alert: true,
                cluster: true,
            },
        });

        if (!latestPlan) {
            return res.json({
                inputNarrative: "",
                evidenceSummary: "",
                outputs: [],
                plan: [],
            });
        }

        return res.json(buildActionPlanResponse(latestPlan));
    } catch (error) {
        console.error("Error fetching action plan contract data:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
