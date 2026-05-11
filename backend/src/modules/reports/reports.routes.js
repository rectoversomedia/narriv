import express from "express";
import prisma from "../../prisma.js";
import { generateReport } from "./reports.service.js";
import {
    cleanupExpiredReportExports,
    resolveSignedReportDownload,
    storeReportExportPayload
} from "./report-export-storage.service.js";
import { incrementExportFailure } from "../../lib/metrics.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveScopedWorkspaceIds, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { createReportBodySchema, createReportExportBodySchema, reportIdParamsSchema } from "./reports.schema.js";

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
        id: report.id,
        title: report.title,
        readiness: Number(template.readiness || 70),
        sections: template.sections || "Signals, clusters, insights",
        status: template.status || "In progress",
    };
}

function buildPdfData(fullReport, reportId) {
    const metrics = fullReport.sections.dashboard_metrics;
    const alerts = fullReport.sections.alerts;
    const narratives = fullReport.sections.narratives;

    return {
        metadata: {
            title: fullReport.title,
            generatedAt: new Date().toISOString(),
            periodStart: fullReport.periodStart,
            periodEnd: fullReport.periodEnd,
            reportId,
        },
        sections: [
            {
                order: 1,
                heading: "Executive Summary",
                type: "text",
                content: fullReport.summary,
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
                    { label: "Mixed", value: `${metrics.sentiment_percentages.mixed}%` },
                ],
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
                    { label: "Mixed", value: metrics.sentiment_distribution.mixed, color: "#f59e0b" },
                ],
            },
            {
                order: 4,
                heading: "Platform Distribution",
                type: "chart_data",
                chartType: "bar",
                data: metrics.platform_distribution.map((p) => ({
                    label: p.platform,
                    value: p.count,
                })),
            },
            {
                order: 5,
                heading: "Alerts Overview",
                type: "summary_with_table",
                summary: `${alerts.total} alerts detected. ${alerts.by_severity.critical + alerts.by_severity.high} require immediate attention.`,
                columns: ["Title", "Severity", "Status", "What Happened"],
                rows: alerts.items.map((a) => [
                    a.title,
                    a.severity,
                    a.status,
                    a.whatHappened || "-",
                ]),
            },
            {
                order: 6,
                heading: "Narrative Clusters",
                type: "cards",
                items: narratives.items.map((n) => ({
                    title: n.title,
                    description: n.description,
                    sentiment: n.sentiment,
                    impact: n.impact,
                    signalCount: n.signalCount,
                })),
            },
            {
                order: 7,
                heading: "Top Signals",
                type: "table",
                columns: ["Title", "Platform", "Sentiment", "Date"],
                rows: metrics.top_signals.map((s) => [
                    s.title,
                    s.platform,
                    s.sentiment,
                    new Date(s.capturedAt).toLocaleDateString("en-US"),
                ]),
            },
        ],
    };
}

// POST /api/reports - Generate a new intelligence report
router.post("/", validateRequest({ body: createReportBodySchema }), async (req, res) => {
    try {
        const { workspaceId, title, periodStart, periodEnd } = req.body;
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const report = await generateReport({ workspaceId: scopedWorkspaceId, title, periodStart, periodEnd });
        return res.status(201).json(report);
    } catch (error) {
        console.error("Error generating report:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/reports - Frontend contract endpoint
router.get("/", async (req, res) => {
    try {
        const { workspaceId } = req.query;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const safePage = Math.max(1, page);
        const safeLimit = Math.max(1, limit);
        const skip = (safePage - 1) * safeLimit;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);
        if (scopedWorkspaceIds.length === 0) {
            return res.json({
                data: [],
                pagination: { page: safePage, limit: safeLimit, total: 0, totalPages: 0 }
            });
        }

        const where = { workspaceId: { in: scopedWorkspaceIds } };
        const [data, total] = await Promise.all([
            prisma.report.findMany({
                where,
                skip,
                take: safeLimit,
                orderBy: { createdAt: "desc" },
            }),
            prisma.report.count({ where })
        ]);

        return res.json({
            data: data.map(toFrontendReport),
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit)
            }
        });
    } catch (error) {
        console.error("Error fetching reports:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/reports/:id/export - Create report export job
router.post("/:id/export", validateRequest({ params: reportIdParamsSchema, body: createReportExportBodySchema }), async (req, res) => {
    try {
        await cleanupExpiredReportExports();
        const { id } = req.params;
        const { format = "json" } = req.body || {};
        const normalizedFormat = String(format).toLowerCase();
        if (!["json", "pdf"].includes(normalizedFormat)) {
            return res.status(400).json({ error: "format must be one of: json, pdf" });
        }

        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);
        const report = await prisma.report.findUnique({ where: { id } });
        if (!report || !scopedWorkspaceIds.includes(report.workspaceId)) {
            return res.status(404).json({ error: "Report not found" });
        }

        const exportJob = await prisma.reportExport.create({
            data: {
                reportId: report.id,
                status: "queued",
                format: normalizedFormat,
            }
        });

        try {
            await prisma.reportExport.update({ where: { id: exportJob.id }, data: { status: "running" } });

            const fullReport = await generateReport({
                workspaceId: report.workspaceId,
                title: report.title,
                periodStart: report.periodStart,
                periodEnd: report.periodEnd,
            });

            const payload = normalizedFormat === "pdf"
                ? buildPdfData(fullReport, report.id)
                : {
                    ...fullReport,
                    id: report.id,
                    createdAt: report.createdAt,
                    exportedAt: new Date().toISOString(),
                };

            const baseUrl = `${req.protocol}://${req.get("host")}`;
            await storeReportExportPayload({
                exportId: exportJob.id,
                payload,
                fileName: `narriv-report-${report.id.substring(0, 8)}.${normalizedFormat}`,
                baseUrl,
            });
        } catch (jobError) {
            incrementExportFailure();
            await prisma.reportExport.update({
                where: { id: exportJob.id },
                data: {
                    status: "failed",
                    errorMessage: jobError.message || "Export failed",
                }
            });
        }

        return res.status(202).json({ message: "Export job created", jobId: exportJob.id });
    } catch (error) {
        console.error("Error creating export job:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/reports/exports/:jobId - Get export job status
router.get("/exports/:jobId", async (req, res) => {
    try {
        await cleanupExpiredReportExports();
        const { jobId } = req.params;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        const job = await prisma.reportExport.findUnique({
            where: { id: jobId },
            include: { report: true },
        });

        if (!job || !scopedWorkspaceIds.includes(job.report.workspaceId)) {
            return res.status(404).json({ error: "Export job not found" });
        }

        return res.json({
            jobId: job.id,
            reportId: job.reportId,
            format: job.format,
            status: job.status,
            errorMessage: job.errorMessage,
            signedUrl: job.status === "completed" ? job.signedUrl : null,
            expiresAt: job.expiresAt,
        });
    } catch (error) {
        console.error("Error fetching export job:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/reports/exports/:jobId/download?token=... - Signed download URL endpoint
router.get("/exports/:jobId/download", async (req, res) => {
    try {
        await cleanupExpiredReportExports();
        const { jobId } = req.params;
        const { token } = req.query;
        if (!token) return res.status(400).json({ error: "token is required" });

        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);
        const job = await prisma.reportExport.findUnique({
            where: { id: jobId },
            include: { report: true },
        });

        if (!job || !scopedWorkspaceIds.includes(job.report.workspaceId)) {
            return res.status(404).json({ error: "Export job not found" });
        }
        const resolved = await resolveSignedReportDownload({ exportId: jobId, token: String(token) });
        if (!resolved.ok) {
            return res.status(resolved.status).json({ error: resolved.error });
        }

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${job.fileName || `report-export-${job.id}.${job.format}`}"`);
        return res.json(resolved.payload);
    } catch (error) {
        console.error("Error downloading export file:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/reports/:id - Get a single report (re-generates full sections)
router.get("/:id", async (req, res) => {
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
            periodEnd: report.periodEnd,
        });

        return res.json({ ...fullReport, id: report.id, createdAt: report.createdAt });
    } catch (error) {
        console.error("Error fetching report:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/reports/:id/export/json - Export full report as downloadable JSON
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
            periodEnd: report.periodEnd,
        });

        const exportData = {
            ...fullReport,
            id: report.id,
            createdAt: report.createdAt,
            exportedAt: new Date().toISOString(),
        };

        const filename = `narriv-report-${report.id.substring(0, 8)}.json`;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.json(exportData);
    } catch (error) {
        console.error("Error exporting report JSON:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/reports/:id/export/pdf - Export PDF-ready structured data
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
            periodEnd: report.periodEnd,
        });

        return res.json(buildPdfData(fullReport, report.id));
    } catch (error) {
        console.error("Error exporting PDF-ready data:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
