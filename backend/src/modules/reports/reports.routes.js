import express from "express";
import supabase from "../../lib/supabase.js";
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
import { createReportBodySchema, createReportExportBodySchema, reportIdParamsSchema, createReportTemplateSchema, updateReportTemplateSchema, createReportScheduleSchema, updateReportScheduleSchema, generateReportBodySchema, sendReportEmailBodySchema } from "./reports.schema.js";
import { generateReport as generateFromTemplate, sendReportEmail } from "./report-generation.js";
import { getAllReportTemplates } from "./report-templates.js";
import { recordAuditLog } from "../../lib/audit.js";
import { logStructured } from "../../lib/logger.js";

const router = express.Router();

// Signed export URLs are opened directly by the browser, so they cannot rely on
// the frontend API client injecting an Authorization header.
router.get("/exports/:jobId/download", async (req, res) => {
    try {
        await cleanupExpiredReportExports();
        const { jobId } = req.params;
        const { token } = req.query;
        if (!token) return res.status(400).json({ error: "token is required" });

        const resolved = await resolveSignedReportDownload({ exportId: jobId, token: String(token) });
        if (!resolved.ok) {
            return res.status(resolved.status).json({ error: resolved.error });
        }

        const { job, payload } = resolved;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${job.fileName || `report-export-${job.id}.${job.format}`}"`);
        return res.json(payload);
    } catch (error) {
        logStructured("error", "Error downloading export file:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

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
        await recordAuditLog({
            userId: req.user.id,
            event: "report_created",
            workspaceId: scopedWorkspaceId,
            metadata: { reportId: report.id, title: report.title },
        });
        return res.status(201).json(report);
    } catch (error) {
        logStructured("error", "Error generating report:", { error: error?.message || error, stack: error?.stack });
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

        const [dataResult, countResult] = await Promise.all([
            supabase
                .from("reports")
                .select("*")
                .in("workspace_id", scopedWorkspaceIds)
                .order("created_at", { ascending: false })
                .range(skip, skip + safeLimit - 1),
            supabase
                .from("reports")
                .select("id", { count: "exact", head: true })
                .in("workspace_id", scopedWorkspaceIds)
        ]);

        const data = dataResult.data || [];
        const total = countResult.count || 0;

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
        logStructured("error", "Error fetching reports:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/reports/templates — List available report templates
router.get("/templates", async (req, res) => {
    try {
        const { workspaceId } = req.query;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);

        const systemTemplates = getAllReportTemplates().map(t => ({ ...t, isSystem: true }));

        let customTemplates = [];
        if (scopedWorkspaceIds.length > 0) {
            const { data: dbTemplates } = await supabase
                .from("report_templates")
                .select("*")
                .in("workspace_id", scopedWorkspaceIds)
                .order("created_at", { ascending: false });
            customTemplates = (dbTemplates || []).map(t => ({
                key: t.id,
                name: t.name,
                description: t.description || "",
                format: t.format,
                cadence: t.cadence,
                sectionCount: t.section_count,
                isSystem: false
            }));
        }

        return res.json({ data: [...systemTemplates, ...customTemplates] });
    } catch (error) {
        logStructured("error", "Error fetching templates:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/reports/templates — Create custom template
router.post("/templates", validateRequest({ body: createReportTemplateSchema }), async (req, res) => {
    try {
        const { name, description, format, cadence, sectionCount } = req.body;
        const { workspaceId } = req.query;

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const { data: template, error } = await supabase
            .from("report_templates")
            .insert({
                workspace_id: scopedWorkspaceId,
                name,
                description,
                format: format || "PDF",
                cadence: cadence || "On-demand",
                section_count: sectionCount || 3
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return res.status(201).json(template);
    } catch (error) {
        logStructured("error", "Error creating template:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/reports/templates/:id — Update custom template
router.patch("/templates/:id", validateRequest({ body: updateReportTemplateSchema }), async (req, res) => {
    try {
        const { id } = req.params;

        const { data: template, error: findError } = await supabase
            .from("report_templates")
            .select("*")
            .eq("id", id)
            .single();

        if (findError || !template) {
            return res.status(404).json({ error: "Template not found" });
        }

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, template.workspace_id);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Access denied" });
        }

        const { name, description, format, cadence, sectionCount } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (format !== undefined) updateData.format = format;
        if (cadence !== undefined) updateData.cadence = cadence;
        if (sectionCount !== undefined) updateData.section_count = sectionCount;

        const { data: updated, error: updateError } = await supabase
            .from("report_templates")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (updateError) {
            throw updateError;
        }

        return res.json(updated);
    } catch (error) {
        logStructured("error", "Error updating template:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/reports/templates/:id — Delete custom template
router.delete("/templates/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const { data: template, error: findError } = await supabase
            .from("report_templates")
            .select("*")
            .eq("id", id)
            .single();

        if (findError || !template) {
            return res.status(404).json({ error: "Template not found" });
        }

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, template.workspace_id);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Access denied" });
        }

        const { error: deleteError } = await supabase
            .from("report_templates")
            .delete()
            .eq("id", id);

        if (deleteError) {
            throw deleteError;
        }

        return res.json({ success: true });
    } catch (error) {
        logStructured("error", "Error deleting template:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// ============================================================
// REPORT SCHEDULES CRUD
// ============================================================

// GET /api/reports/schedules — List schedules for workspace
router.get("/schedules", async (req, res) => {
    try {
        const { workspaceId } = req.query;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);
        if (scopedWorkspaceIds.length === 0) {
            return res.json({ data: [] });
        }

        const { data: schedules, error } = await supabase
            .from("report_schedules")
            .select("*")
            .in("workspace_id", scopedWorkspaceIds)
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        return res.json({ data: schedules || [] });
    } catch (error) {
        logStructured("error", "Error fetching schedules:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/reports/schedules — Create schedule
router.post("/schedules", validateRequest({ body: createReportScheduleSchema }), async (req, res) => {
    try {
        const { templateKey, name, cadence, dayOfWeek, timeOfDay, enabled } = req.body;
        const { workspaceId } = req.query;

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const { data: schedule, error } = await supabase
            .from("report_schedules")
            .insert({
                workspace_id: scopedWorkspaceId,
                template_key: templateKey,
                name,
                cadence: cadence || "weekly",
                day_of_week: dayOfWeek || null,
                time_of_day: timeOfDay || "09:00",
                enabled: enabled !== false
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return res.status(201).json(schedule);
    } catch (error) {
        logStructured("error", "Error creating schedule:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/reports/schedules/:id — Update schedule
router.patch("/schedules/:id", validateRequest({ body: updateReportScheduleSchema }), async (req, res) => {
    try {
        const { id } = req.params;

        const { data: schedule, error: findError } = await supabase
            .from("report_schedules")
            .select("*")
            .eq("id", id)
            .single();

        if (findError || !schedule) {
            return res.status(404).json({ error: "Schedule not found" });
        }

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, schedule.workspace_id);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Access denied" });
        }

        const { templateKey, name, cadence, dayOfWeek, timeOfDay, enabled } = req.body;

        const updateData = {};
        if (templateKey !== undefined) updateData.template_key = templateKey;
        if (name !== undefined) updateData.name = name;
        if (cadence !== undefined) updateData.cadence = cadence;
        if (dayOfWeek !== undefined) updateData.day_of_week = dayOfWeek;
        if (timeOfDay !== undefined) updateData.time_of_day = timeOfDay;
        if (enabled !== undefined) updateData.enabled = enabled;

        const { data: updated, error: updateError } = await supabase
            .from("report_schedules")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (updateError) {
            throw updateError;
        }

        return res.json(updated);
    } catch (error) {
        logStructured("error", "Error updating schedule:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/reports/schedules/:id — Delete schedule
router.delete("/schedules/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const { data: schedule, error: findError } = await supabase
            .from("report_schedules")
            .select("*")
            .eq("id", id)
            .single();

        if (findError || !schedule) {
            return res.status(404).json({ error: "Schedule not found" });
        }

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, schedule.workspace_id);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Access denied" });
        }

        const { error: deleteError } = await supabase
            .from("report_schedules")
            .delete()
            .eq("id", id);

        if (deleteError) {
            throw deleteError;
        }

        return res.json({ success: true });
    } catch (error) {
        logStructured("error", "Error deleting schedule:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/reports/schedules/:id/toggle — Toggle schedule enabled/disabled
router.patch("/schedules/:id/toggle", async (req, res) => {
    try {
        const { id } = req.params;

        const { data: schedule, error: findError } = await supabase
            .from("report_schedules")
            .select("*")
            .eq("id", id)
            .single();

        if (findError || !schedule) {
            return res.status(404).json({ error: "Schedule not found" });
        }

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, schedule.workspace_id);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Access denied" });
        }

        const { data: updated, error: updateError } = await supabase
            .from("report_schedules")
            .update({ enabled: !schedule.enabled })
            .eq("id", id)
            .select()
            .single();

        if (updateError) {
            throw updateError;
        }

        return res.json(updated);
    } catch (error) {
        logStructured("error", "Error toggling schedule:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/reports/analytics — Aggregate metrics: format distribution, top templates, trend timeline
router.get("/analytics", async (req, res) => {
    try {
        const { workspaceId } = req.query;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);
        if (scopedWorkspaceIds.length === 0) {
            return res.json({
                format_distribution: { json: 0, pdf: 0 },
                popular_templates: [],
                trend_timeline: [],
            });
        }

        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

        // Get format distribution from report_exports
        const { data: exportGroups } = await supabase
            .from("report_exports")
            .select("format")
            .in("report_id", scopedWorkspaceIds.map(id => id));

        const formatDistribution = { json: 0, pdf: 0 };
        for (const row of (exportGroups || [])) {
            const fmt = String(row.format || "").toLowerCase();
            if (fmt === "json") formatDistribution.json++;
            else if (fmt === "pdf") formatDistribution.pdf++;
        }

        // Get popular reports by title
        const { data: reportGroups } = await supabase
            .from("reports")
            .select("title")
            .in("workspace_id", scopedWorkspaceIds);

        const titleCounts = {};
        for (const row of (reportGroups || [])) {
            const title = row.title || "Unknown";
            titleCounts[title] = (titleCounts[title] || 0) + 1;
        }
        const popularTemplates = Object.entries(titleCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        // Get trend timeline - reports generated per day for last 14 days
        const { data: trendReports } = await supabase
            .from("reports")
            .select("created_at")
            .in("workspace_id", scopedWorkspaceIds)
            .gte("created_at", fourteenDaysAgo.toISOString());

        const dayBuckets = {};
        for (let i = 13; i >= 0; i--) {
            const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const key = d.toISOString().split("T")[0];
            dayBuckets[key] = 0;
        }
        for (const r of (trendReports || [])) {
            const key = new Date(r.created_at).toISOString().split("T")[0];
            if (key in dayBuckets) dayBuckets[key] += 1;
        }
        const trendTimeline = Object.entries(dayBuckets).map(([date, count]) => ({ date, count }));

        return res.json({
            format_distribution: formatDistribution,
            popular_templates: popularTemplates,
            trend_timeline: trendTimeline,
        });
    } catch (error) {
        logStructured("error", "Error fetching reports analytics:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/reports/generate — Generate a report from a template
router.post("/generate", validateRequest({ body: generateReportBodySchema }), async (req, res) => {
    try {
        const { templateKey, dateRange } = req.body;
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.body.workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const report = await generateFromTemplate({
            workspaceId: scopedWorkspaceId,
            templateKey,
            options: { dateRange },
        });
        await recordAuditLog({
            userId: req.user.id,
            event: "report_generated_from_template",
            workspaceId: scopedWorkspaceId,
            metadata: { reportId: report.id, templateKey },
        });

        return res.status(201).json(report);
    } catch (error) {
        logStructured("error", "Error generating report:", { error: error?.message || error, stack: error?.stack });
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

        const { data: report, error: reportError } = await supabase
            .from("reports")
            .select("*")
            .eq("id", id)
            .single();

        if (reportError || !report || !scopedWorkspaceIds.includes(report.workspace_id)) {
            return res.status(404).json({ error: "Report not found" });
        }

        const { data: exportJob, error: createError } = await supabase
            .from("report_exports")
            .insert({
                report_id: report.id,
                status: "queued",
                format: normalizedFormat,
            })
            .select()
            .single();

        if (createError) {
            throw createError;
        }

        try {
            await supabase
                .from("report_exports")
                .update({ status: "running" })
                .eq("id", exportJob.id);

            const fullReport = await generateReport({
                workspaceId: report.workspace_id,
                title: report.title,
                periodStart: report.period_start,
                periodEnd: report.period_end,
            });

            const payload = normalizedFormat === "pdf"
                ? buildPdfData(fullReport, report.id)
                : {
                    ...fullReport,
                    id: report.id,
                    createdAt: report.created_at,
                    exportedAt: new Date().toISOString(),
                };

            const baseUrl = `${req.protocol}://${req.get("host")}`;
            await storeReportExportPayload({
                exportId: exportJob.id,
                payload,
                fileName: `narriv-report-${report.id.substring(0, 8)}.${normalizedFormat}`,
                baseUrl,
            });
            await recordAuditLog({
                userId: req.user.id,
                event: "report_export_created",
                workspaceId: report.workspace_id,
                metadata: { reportId: report.id, exportId: exportJob.id, format: normalizedFormat },
            });
        } catch (jobError) {
            incrementExportFailure();
            await supabase
                .from("report_exports")
                .update({
                    status: "failed",
                    error_message: jobError.message || "Export failed",
                })
                .eq("id", exportJob.id);
        }

        return res.status(202).json({ message: "Export job created", jobId: exportJob.id });
    } catch (error) {
        logStructured("error", "Error creating export job:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/reports/exports/:jobId - Get export job status
router.get("/exports/:jobId", async (req, res) => {
    try {
        await cleanupExpiredReportExports();
        const { jobId } = req.params;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        const { data: job, error } = await supabase
            .from("report_exports")
            .select("*, report:reports(*)")
            .eq("id", jobId)
            .single();

        if (error || !job || !scopedWorkspaceIds.includes(job.report?.workspace_id)) {
            return res.status(404).json({ error: "Export job not found" });
        }

        return res.json({
            jobId: job.id,
            reportId: job.report_id,
            format: job.format,
            status: job.status,
            errorMessage: job.error_message,
            signedUrl: job.status === "completed" ? job.signed_url : null,
            expiresAt: job.expires_at,
        });
    } catch (error) {
        logStructured("error", "Error fetching export job:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/reports/:id - Get a single report (re-generates full sections)
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        const { data: report, error } = await supabase
            .from("reports")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !report || !scopedWorkspaceIds.includes(report.workspace_id)) {
            return res.status(404).json({ error: "Report not found" });
        }

        const fullReport = await generateReport({
            workspaceId: report.workspace_id,
            title: report.title,
            periodStart: report.period_start,
            periodEnd: report.period_end,
        });

        return res.json({ ...fullReport, id: report.id, createdAt: report.created_at });
    } catch (error) {
        logStructured("error", "Error fetching report:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/reports/:id/export/json - Export full report as downloadable JSON
router.get("/:id/export/json", async (req, res) => {
    try {
        const { id } = req.params;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        const { data: report, error } = await supabase
            .from("reports")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !report || !scopedWorkspaceIds.includes(report.workspace_id)) {
            return res.status(404).json({ error: "Report not found" });
        }

        const fullReport = await generateReport({
            workspaceId: report.workspace_id,
            title: report.title,
            periodStart: report.period_start,
            periodEnd: report.period_end,
        });

        const exportData = {
            ...fullReport,
            id: report.id,
            createdAt: report.created_at,
            exportedAt: new Date().toISOString(),
        };

        const filename = `narriv-report-${report.id.substring(0, 8)}.json`;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.json(exportData);
    } catch (error) {
        logStructured("error", "Error exporting report JSON:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/reports/:id/export/pdf - Export PDF-ready structured data
router.get("/:id/export/pdf", async (req, res) => {
    try {
        const { id } = req.params;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        const { data: report, error } = await supabase
            .from("reports")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !report || !scopedWorkspaceIds.includes(report.workspace_id)) {
            return res.status(404).json({ error: "Report not found" });
        }

        const fullReport = await generateReport({
            workspaceId: report.workspace_id,
            title: report.title,
            periodStart: report.period_start,
            periodEnd: report.period_end,
        });

        return res.json(buildPdfData(fullReport, report.id));
    } catch (error) {
        logStructured("error", "Error exporting PDF-ready data:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/reports/:id/send-email — Send report via email
router.post("/:id/send-email", validateRequest({ params: reportIdParamsSchema, body: sendReportEmailBodySchema }), async (req, res) => {
    try {
        const { id } = req.params;
        const { recipientEmail, subject, body } = req.body;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        const { data: report, error } = await supabase
            .from("reports")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !report || !scopedWorkspaceIds.includes(report.workspace_id)) {
            return res.status(404).json({ error: "Report not found" });
        }

        const result = await sendReportEmail({
            workspaceId: report.workspace_id,
            reportId: report.id,
            recipientEmail,
            subject: subject || `Report: ${report.title}`,
            body: body || `The report "${report.title}" is now available for review.`,
        });

        return res.json(result);
    } catch (error) {
        logStructured("error", "Error sending report email:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
