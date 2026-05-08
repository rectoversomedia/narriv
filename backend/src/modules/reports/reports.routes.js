import express from "express";
import prisma from "../../prisma.js";
import { generateReport } from "./reports.service.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveScopedWorkspaceIds, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";

const router = express.Router();
router.use(verifyToken);


const REPORT_TEMPLATES = {
    "Weekly Narrative Intelligence Brief": {
        readiness: 92,
        sections: "Signals, clusters, GEO, actions",
        status: "Ready for exec review",
    },
    "AI Visibility Movement Report": {
        readiness: 76,
        sections: "Prompt set, citations, competitors",
        status: "Needs GEO annotations",
    },
    "Predictive Risk Review": {
        readiness: 64,
        sections: "Drivers, owner actions, learning loop",
        status: "Awaiting comms feedback",
    },
};

function toFrontendReport(report) {
    const template = REPORT_TEMPLATES[report.title] || {};
    return {
        title: report.title,
        readiness: Number(template.readiness || 70),
        sections: template.sections || "Signals, clusters, insights",
        status: template.status || "In progress",
    };
}
// POST /api/reports — Generate a new intelligence report
router.post("/", async (req, res) => {
    try {
        const { workspaceId, title, periodStart, periodEnd } = req.body;
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const report = await generateReport({ workspaceId: scopedWorkspaceId, title, periodStart, periodEnd });

        res.status(201).json(report);
    } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/reports - Frontend contract endpoint
router.get("/", async (req, res) => {
    try {
        const { workspaceId } = req.query;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);
        if (scopedWorkspaceIds.length === 0) {
            return res.json({ reports: [] });
        }

        const whereClause = { workspaceId: { in: scopedWorkspaceIds } };

        const data = await prisma.report.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" }
        });

        res.json({
            reports: data.map(toFrontendReport),
        });
    } catch (error) {
        console.error("Error fetching reports:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// GET /api/reports/:id — Get a single report (re-generates full sections)
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        const report = await prisma.report.findUnique({
            where: { id }
        });

        if (!report || !scopedWorkspaceIds.includes(report.workspaceId)) {
            return res.status(404).json({ error: "Report not found" });
        }

        // Re-generate the full report content from the saved period
        const fullReport = await generateReport({
            workspaceId: report.workspaceId,
            title: report.title,
            periodStart: report.periodStart,
            periodEnd: report.periodEnd
        });

        // Return using the original report ID and createdAt
        res.json({
            ...fullReport,
            id: report.id,
            createdAt: report.createdAt
        });
    } catch (error) {
        console.error("Error fetching report:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// GET /api/reports/:id/export/json — Export full report as downloadable JSON
router.get("/:id/export/json", async (req, res) => {
    try {
        const { id } = req.params;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        const report = await prisma.report.findUnique({ where: { id } });
        if (!report || !scopedWorkspaceIds.includes(report.workspaceId)) {
            return res.status(404).json({ error: "Report not found" });
        }

        const fullReport = await generateReport({
            workspaceId: report.workspaceId,
            title: report.title,
            periodStart: report.periodStart,
            periodEnd: report.periodEnd
        });

        const exportData = {
            ...fullReport,
            id: report.id,
            createdAt: report.createdAt,
            exportedAt: new Date().toISOString()
        };

        const filename = `narriv-report-${report.id.substring(0, 8)}.json`;

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.json(exportData);
    } catch (error) {
        console.error("Error exporting report JSON:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/reports/:id/export/pdf — Export PDF-ready structured data
router.get("/:id/export/pdf", async (req, res) => {
    try {
        const { id } = req.params;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        const report = await prisma.report.findUnique({ where: { id } });
        if (!report || !scopedWorkspaceIds.includes(report.workspaceId)) {
            return res.status(404).json({ error: "Report not found" });
        }

        const fullReport = await generateReport({
            workspaceId: report.workspaceId,
            title: report.title,
            periodStart: report.periodStart,
            periodEnd: report.periodEnd
        });

        const metrics = fullReport.sections.dashboard_metrics;
        const alerts = fullReport.sections.alerts;
        const narratives = fullReport.sections.narratives;

        // Build PDF-ready document structure with ordered sections
        const pdfData = {
            metadata: {
                title: fullReport.title,
                generatedAt: new Date().toISOString(),
                periodStart: fullReport.periodStart,
                periodEnd: fullReport.periodEnd,
                reportId: report.id
            },
            sections: [
                {
                    order: 1,
                    heading: "Executive Summary",
                    type: "text",
                    content: fullReport.summary
                },
                {
                    order: 2,
                    heading: "Key Performance Indicators",
                    type: "kpi_grid",
                    items: [
                        { label: "Total Signals", value: metrics.total_signals },
                        { label: "Analyzed Signals", value: metrics.analyzed_signals },
                        { label: "Positive", value: `${metrics.sentiment_percentages.positive}%` },
                        { label: "Negative", value: `${metrics.sentiment_percentages.negative}%` },
                        { label: "Neutral", value: `${metrics.sentiment_percentages.neutral}%` },
                        { label: "Mixed", value: `${metrics.sentiment_percentages.mixed}%` }
                    ]
                },
                {
                    order: 3,
                    heading: "Sentiment Distribution",
                    type: "chart_data",
                    chartType: "pie",
                    data: [
                        { label: "Positive", value: metrics.sentiment_distribution.positive, color: "#22c55e" },
                        { label: "Negative", value: metrics.sentiment_distribution.negative, color: "#ef4444" },
                        { label: "Neutral", value: metrics.sentiment_distribution.neutral, color: "#64748b" },
                        { label: "Mixed", value: metrics.sentiment_distribution.mixed, color: "#f59e0b" }
                    ]
                },
                {
                    order: 4,
                    heading: "Platform Distribution",
                    type: "chart_data",
                    chartType: "bar",
                    data: metrics.platform_distribution.map(p => ({
                        label: p.platform,
                        value: p.count
                    }))
                },
                {
                    order: 5,
                    heading: "Alerts Overview",
                    type: "summary_with_table",
                    summary: `${alerts.total} alerts detected. ${alerts.by_severity.critical + alerts.by_severity.high} require immediate attention.`,
                    columns: ["Title", "Severity", "Status", "What Happened"],
                    rows: alerts.items.map(a => [
                        a.title,
                        a.severity,
                        a.status,
                        a.whatHappened || "—"
                    ])
                },
                {
                    order: 6,
                    heading: "Narrative Clusters",
                    type: "cards",
                    items: narratives.items.map(n => ({
                        title: n.title,
                        description: n.description,
                        sentiment: n.sentiment,
                        impact: n.impact,
                        signalCount: n.signalCount
                    }))
                },
                {
                    order: 7,
                    heading: "Top Signals",
                    type: "table",
                    columns: ["Title", "Platform", "Sentiment", "Date"],
                    rows: metrics.top_signals.map(s => [
                        s.title,
                        s.platform,
                        s.sentiment,
                        new Date(s.capturedAt).toLocaleDateString("en-US")
                    ])
                }
            ]
        };

        res.json(pdfData);
    } catch (error) {
        console.error("Error exporting PDF-ready data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
