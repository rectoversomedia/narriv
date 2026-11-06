import express from "express";
import { requestLang, tr } from "../../lib/request-context.js";
import supabase from "../../lib/supabase.js";
import { analyzeSignal, generateSignalsSummary } from "../ai/ai.service.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { getUserWorkspaceIds, getWorkspaceRole, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { createSignalBodySchema, signalIdParamsSchema } from "./signals.schema.js";
import { logStructured } from "../../lib/logger.js";
import { globalEvents } from "../app-notifications/app-notifications.events.js";
import { recordAuditLog } from "../../lib/audit.js";
import { wrapAsync } from "../../lib/sentry.js";
import { buildXlsx, objectsToRows, rowsToCsv } from "../../lib/spreadsheet.js";
import { classifyRecord, loadRelevanceContext } from "../../lib/brand-relevance.js";

const router = express.Router();
router.use(verifyToken);


// GET semua data dengan pagination dan filtering

// List rows carry persisted narrative membership and analysis status. Nothing
// here is inferred: narratives come only from narrative_cluster_signals in the
// caller's workspaces; a signal without an analysis row is "unanalyzed".
const SIGNAL_LIST_SELECT =
    "*, narrative_cluster_signals(cluster:narrative_clusters(id, title, workspace_id)), analyses:signal_analyses(confidence, analysis)";

// Strip PostgREST filter syntax characters from free-text search input.
const sanitizeSearch = (v) => String(v).replace(/[,()*%\\]/g, " ").trim().slice(0, 100);

// Older ingestion appended the AI summary to the content ("… (AI Summary: …)"); the summary lives in
// metadata.ai_summary, so the suffix is stripped wherever content is shown or exported.
export function cleanSignalContent(content) {
    return typeof content === "string" ? content.replace(/\s*\(AI Summary: [\s\S]*\)\s*$/, "") : content;
}

export function toSignalListItem(row, workspaceIds = []) {
    const { narrative_cluster_signals: links, analyses, ...signal } = row;
    const narratives = (links || [])
        .map((l) => l.cluster)
        .filter((c) => c && (!workspaceIds.length || workspaceIds.includes(c.workspace_id)))
        .map((c) => ({ id: c.id, title: c.title }));
    const analysis = (analyses || [])[0] || null;
    const rawConf = Number(analysis?.analysis?.confidence_score ?? analysis?.confidence);
    return {
        ...signal,
        content: cleanSignalContent(signal.content),
        aiSummary: signal.metadata?.ai_summary ?? null,
        // camelCase aliases expected by the frontend Signal type (snake_case kept).
        capturedAt: signal.captured_at,
        publishedAt: signal.published_at,
        sourceId: signal.source_id,
        narratives,
        analysisStatus: analysis ? "analyzed" : "unanalyzed",
        analysisConfidence: Number.isFinite(rawConf) && rawConf >= 0 && rawConf <= 1 ? rawConf : null,
    };
}

// Filters: keyword, platform, sentiment, startDate/endDate (collection time),
// narrativeId (persisted membership in this workspace), relevance ("direct":
// names the brand, "other": does not) and analysis ("analyzed" | "pending").
// Every row also carries its brand relevance, classified from its own text.
router.get("/", async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;

        const { keyword, platform, startDate, endDate, sentiment, narrativeId, relevance, analysis } = req.query;

        const safePage = Math.max(1, page);
        const safeLimit = Math.min(100, Math.max(1, limit));
        const skip = (safePage - 1) * safeLimit;
        const emptyPage = () => res.json({ data: [], pagination: { page: safePage, limit: safeLimit, total: 0, totalPages: 0 }, relevance: null });

        if (workspaceIds.length === 0) return emptyPage();
        if (relevance && !["direct", "other"].includes(relevance)) return res.status(400).json({ error: "relevance must be direct or other." });
        if (analysis && !["analyzed", "pending"].includes(analysis)) return res.status(400).json({ error: "analysis must be analyzed or pending." });

        // Build dynamic query using Supabase
        let query = supabase
            .from('signals')
            .select(SIGNAL_LIST_SELECT, { count: 'exact' })
            .in('workspace_id', workspaceIds);

        const term = keyword ? sanitizeSearch(keyword) : "";
        if (term) {
            // Supabase uses ilike for case-insensitive contains
            query = query.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
        }

        if (platform) {
            query = query.eq('platform', platform);
        }

        if (sentiment) {
            query = query.ilike('sentiment', sentiment);
        }

        // Analysis status: a stored sentiment exists only after AI analysis.
        if (analysis === "analyzed") query = query.not('sentiment', 'is', null);
        if (analysis === "pending") query = query.is('sentiment', null);

        if (narrativeId) {
            // Only a narrative of the caller's workspace, and only its linked records.
            const { data: cluster } = await supabase.from('narrative_clusters').select('id').eq('id', String(narrativeId)).in('workspace_id', workspaceIds).maybeSingle();
            if (!cluster) return res.status(404).json({ error: "Narrative not found." });
            const { data: links, error: linkErr } = await supabase.from('narrative_cluster_signals').select('signal_id').eq('cluster_id', cluster.id).limit(1000);
            if (linkErr) throw linkErr;
            const linkedIds = [...new Set((links || []).map((l) => l.signal_id).filter(Boolean))];
            if (linkedIds.length === 0) return emptyPage();
            query = query.in('id', linkedIds);
        }

        const ctx = await loadRelevanceContext(supabase, workspaceIds[0]);
        if (relevance) {
            if (!ctx.configured) return res.status(409).json({ error: "No brand name or monitoring keyword is configured, so relevance cannot be determined.", code: "RELEVANCE_NOT_CONFIGURED" });
            const terms = ctx.brandTerms.map((t) => sanitizeSearch(t)).filter(Boolean);
            if (relevance === "direct") {
                query = query.or(terms.flatMap((t) => [`title.ilike.%${t}%`, `content.ilike.%${t}%`]).join(","));
            } else {
                for (const t of terms) {
                    query = query.or(`title.is.null,title.not.ilike.%${t}%`).not('content', 'ilike', `%${t}%`);
                }
            }
        }

        if (startDate || endDate) {
            if (startDate) {
                const dateStart = new Date(startDate);
                if (isNaN(dateStart.getTime())) {
                    return res.status(400).json({ error: "Invalid startDate format. Use ISO-8601 or YYYY-MM-DD." });
                }
                query = query.gte('captured_at', dateStart.toISOString());
            }
            if (endDate) {
                const dateEnd = new Date(endDate);
                if (isNaN(dateEnd.getTime())) {
                    return res.status(400).json({ error: "Invalid endDate format. Use ISO-8601 or YYYY-MM-DD." });
                }
                query = query.lte('captured_at', dateEnd.toISOString());
            }
        }

        // No fallback to other periods: an empty period is reported as empty.
        const { data: signalsData, error: signalsError, count } = await query
            .order('captured_at', { ascending: false })
            .range(skip, skip + safeLimit - 1);

        if (signalsError) throw signalsError;

        res.json({
            data: (signalsData || []).map((row) => ({
                ...toSignalListItem(row, workspaceIds),
                relevance: ctx.configured ? classifyRecord(row, ctx).relevance : null,
            })),
            pagination: {
                page: safePage,
                limit: safeLimit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / safeLimit)
            },
            relevance: { configured: ctx.configured, brand: ctx.brandTerms[0] || null, brandSource: ctx.brandSource },
        });
    } catch (error) {
        logStructured("error", "Error fetching signals:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST tambah data
router.post("/", validateRequest({ body: createSignalBodySchema }), async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({
                error: "Request body is empty. Make sure to send JSON with Content-Type: application/json header.",
            });
        }

        const { content, sentiment, workspaceId } = req.body;

        if (!content) {
            return res.status(400).json({
                error: "'content' field is required.",
            });
        }

        const targetWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!targetWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const { data: newSignal, error: createError } = await supabase
            .from('signals')
            .insert({ workspace_id: targetWorkspaceId, content, sentiment })
            .select()
            .single();

        if (createError) throw createError;

        res.json(newSignal);
    } catch (error) {
        logStructured("error", "Error creating signal:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/signals/export - Export signals as CSV or XLSX
router.get("/export", async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const { keyword, platform, startDate, endDate, sentiment, format = "csv" } = req.query;

        let query = supabase
            .from('signals')
            .select('*')
            .in('workspace_id', workspaceIds)
            .order('captured_at', { ascending: false })
            .limit(5000);

        if (keyword) {
            query = query.or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`);
        }
        if (platform) {
            query = query.eq('platform', platform);
        }
        if (sentiment) {
            query = query.ilike('sentiment', sentiment);
        }
        if (startDate) {
            const dateStart = new Date(startDate);
            if (!isNaN(dateStart.getTime())) {
                query = query.gte('captured_at', dateStart.toISOString());
            }
        }
        if (endDate) {
            const dateEnd = new Date(endDate);
            if (!isNaN(dateEnd.getTime())) {
                query = query.lte('captured_at', dateEnd.toISOString());
            }
        }

        const { data: signals, error } = await query;
        if (error) {
            logStructured("error", "Error fetching signals for export:", { error: error.message });
            return res.status(500).json({ error: "Failed to export signals" });
        }

        const rows = (signals || []).map((s) => ({
            ID: s.id,
            Title: s.title || "",
            Platform: s.platform || "",
            Sentiment: s.sentiment || "",
            Severity: s.severity || "",
            "Source URL": s.source_url || "",
            Author: s.author || "",
            "Captured At": s.captured_at || s.created_at || "",
            Content: (cleanSignalContent(s.content) || "").replace(/[\r\n]+/g, " ").slice(0, 1000),
        }));

        const normalizedFormat = String(format).toLowerCase() === "xlsx" ? "xlsx" : "csv";
        const table = objectsToRows(rows.length > 0 ? rows : [{ Note: "No signals found" }]);

        if (normalizedFormat === "xlsx") {
            const buffer = await buildXlsx([{ name: "Signals", rows: table }]);

            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename="narriv-signals-${new Date().toISOString().split("T")[0]}.xlsx"`);
            return res.send(buffer);
        } else {
            const csv = rowsToCsv(table);
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="narriv-signals-${new Date().toISOString().split("T")[0]}.csv"`);
            return res.send(csv);
        }
    } catch (error) {
        logStructured("error", "Error in signals export:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});


// GET /meta - Dashboard metadata
router.get("/meta", async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // The queries are independent, so they run together rather than one after another.
        const [
            { data: rawAlerts, error: alertsError },
            { data: rawActionPlans, error: actionPlansError },
            { data: allSignals, error: signalsError },
            { data: timelineData, error: timelineError },
            { data: rawCases, error: casesError },
            { count: negativeCount, error: negativeError },
            { count: positiveCount, error: positiveError },
            { count: criticalCount, error: criticalError },
            { data: recentSignalsForSummary },
        ] = await Promise.all([
            supabase.from('alerts').select('title, severity, status, created_at, metadata').in('workspace_id', workspaceIds).neq('status', 'resolved').order('created_at', { ascending: false }).limit(3),
            supabase.from('action_plans').select('title, description, priority').in('workspace_id', workspaceIds).order('created_at', { ascending: false }).limit(4),
            // Platform counts over the last 30 days (labelled so on the page); all-time grew without bound.
            supabase.from('signals').select('platform').in('workspace_id', workspaceIds).gte('captured_at', since30d).limit(5000),
            supabase.from('signals').select('captured_at').in('workspace_id', workspaceIds).gte('captured_at', twentyFourHoursAgo),
            supabase.from('cases').select('title, status, assignee_id').in('workspace_id', workspaceIds).order('created_at', { ascending: false }).limit(3),
            supabase.from('signals').select('*', { count: 'exact', head: true }).in('workspace_id', workspaceIds).ilike('sentiment', 'NEGATIVE').gte('captured_at', twentyFourHoursAgo),
            // Neutral/unanalyzed are not positive.
            supabase.from('signals').select('*', { count: 'exact', head: true }).in('workspace_id', workspaceIds).ilike('sentiment', 'POSITIVE').gte('captured_at', twentyFourHoursAgo),
            supabase.from('alerts').select('*', { count: 'exact', head: true }).in('workspace_id', workspaceIds).in('severity', ['critical', 'high']).gte('created_at', twentyFourHoursAgo),
            // Recent signals power the AI summary.
            supabase.from('signals').select('title, content, sentiment, platform').in('workspace_id', workspaceIds).order('captured_at', { ascending: false }).limit(8),
        ]);

        if (alertsError) throw alertsError;
        if (actionPlansError) throw actionPlansError;
        if (signalsError) throw signalsError;
        if (timelineError) throw timelineError;
        if (negativeError) throw negativeError;
        if (positiveError) throw positiveError;
        if (criticalError) throw criticalError;
        if (casesError) {
            logStructured("warn", "cases_fetch_in_meta_failed", { error: casesError.message });
        }

        const followUps = (rawAlerts || []).map(a => ({
            title: a.title,
            badge: (a.severity || 'info').toUpperCase(),
            // What is known about it: the signal counts behind a rules alert, otherwise its workflow status.
            meta: Number.isFinite(a.metadata?.negative_count) && Number.isFinite(a.metadata?.total_count)
                ? tr(`${a.metadata.negative_count} of ${a.metadata.total_count} mentions negative`, `${a.metadata.negative_count} dari ${a.metadata.total_count} percakapan negatif`)
                : a.status === 'acknowledged' ? tr("Acknowledged, not resolved", "Sudah dikonfirmasi, belum selesai") : tr("Not acknowledged yet", "Belum dikonfirmasi"),
            // A date as well as the time: an unresolved alert can be days old.
            time: new Date(a.created_at).toLocaleString(requestLang() === 'id' ? 'id-ID' : 'en-GB', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB',
            tone: a.severity === 'critical' ? 'red' : 'amber'
        }));

        const recommendations = (rawActionPlans || []).map(ap => ({
            title: ap.title,
            desc: ap.description,
            badge: ap.priority,
            tone: 'purple'
        }));

        // Group by platform manually
        const platformCountsMap = {};
        (allSignals || []).forEach(sig => {
            const platform = sig.platform || 'Unknown';
            platformCountsMap[platform] = (platformCountsMap[platform] || 0) + 1;
        });

        const totalSignals = Object.values(platformCountsMap).reduce((acc, curr) => acc + curr, 0);
        const predefinedColors = ['#465FFF', '#EF3F6B', '#10B981', '#8B5CFF', '#94A3B8'];
        const platformEntries = Object.entries(platformCountsMap);
        const sourceDistribution = platformEntries.map(([platform, count], idx) => {
            const percentage = totalSignals ? Math.round((count / totalSignals) * 100) : 0;
            return {
                name: platform,
                value: `${percentage}% (${count})`,
                color: predefinedColors[idx % predefinedColors.length]
            };
        });

        const timeline = Array(24).fill(0);
        const timelineLabels = Array(24).fill('');

        const now = new Date();
        for (let i = 23; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 60 * 60 * 1000);
            timelineLabels[23 - i] = `${date.getHours().toString().padStart(2, '0')}:00`;
        }

        (timelineData || []).forEach(sig => {
            const hDiff = Math.floor((now.getTime() - new Date(sig.captured_at).getTime()) / (60 * 60 * 1000));
            if (hDiff >= 0 && hDiff < 24) {
                timeline[23 - hDiff]++;
            }
        });

        const totalSignals24h = (timelineData || []).length;

        let investigationQueue = [];

        if (rawCases && rawCases.length > 0) {
            investigationQueue = rawCases.map(c => ({
                title: c.title,
                meta: c.assignee_id ? tr("Case has an owner", "Kasus sudah punya penanggung jawab") : tr("Not assigned yet", "Belum ditugaskan"),
                badge: c.status,
                tone: c.status === 'open' ? 'amber' : 'blue'
            }));
        } else {
            // Fallback to alerts if no cases
            const { data: fallbackAlerts, error: fallbackError } = await supabase
                .from('alerts')
                .select('title, status, assigned_team')
                .in('workspace_id', workspaceIds)
                .order('created_at', { ascending: false })
                .limit(3);

            if (fallbackError) throw fallbackError;

            investigationQueue = (fallbackAlerts || []).map(a => ({
                title: a.title,
                meta: a.assigned_team ? tr(`Assigned to ${a.assigned_team}`, `Ditugaskan ke ${a.assigned_team}`) : tr("Not assigned yet", "Belum ditugaskan"),
                badge: a.status,
                tone: a.status === 'open' ? 'amber' : 'blue'
            }));
        }

        const negativeSignals24h = negativeCount || 0;
        const criticalAlerts24h = criticalCount || 0;

        const metrics = {
            totalSignals24h,
            negativeSignals24h,
            positiveSignals24h: positiveCount || 0,
            criticalSignals24h: criticalAlerts24h
        };

        const aiSummary = await generateSignalsSummary(recentSignalsForSummary || [], metrics);

        return res.json({
            totalSignals,
            followUps,
            recommendations,
            sourceDistribution,
            timeline,
            timelineLabels,
            investigationQueue,
            metrics,
            aiSummary
        });

    } catch (error) {
        logStructured("error", "Error fetching meta:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET signal by ID — returns { signal, analysis }
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        // Fetch signal with raw document metadata
        const { data: signal, error: signalError } = await supabase
            .from('signals')
            .select('*, raw_documents(metadata)')
            .eq('id', id)
            .single();

        if (signalError && signalError.code !== 'PGRST116') {
            throw signalError;
        }

        if (!signal || !workspaceIds.includes(signal.workspace_id)) {
            return res.status(404).json({ error: "Signal not found" });
        }

        // Fetch the most recent analysis for this signal
        const { data: latestAnalysis, error: analysisError } = await supabase
            .from('signal_analyses')
            .select('*')
            .eq('signal_id', id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (analysisError && analysisError.code !== 'PGRST116') {
            throw analysisError;
        }

        return res.json({
            signal: { ...signal, content: cleanSignalContent(signal.content) },
            analysis: latestAnalysis ?? { status: "processing" },
        });

    } catch (error) {
        logStructured("error", "Error fetching signal:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});


// POST /signals/:id/analyze — Run AI analysis and save to SignalAnalysis
router.post("/:id/analyze", validateRequest({ params: signalIdParamsSchema }), async (req, res) => {
    try {
        const { id } = req.params;
        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        // 1. Fetch the signal
        const { data: signal, error: signalError } = await supabase
            .from('signals')
            .select('*')
            .eq('id', id)
            .single();

        if (signalError && signalError.code !== 'PGRST116') {
            throw signalError;
        }

        if (!signal || !workspaceIds.includes(signal.workspace_id)) {
            return res.status(404).json({ error: "Signal not found" });
        }

        // 2. Check for existing analysis — prevent duplicate inserts
        const { data: existing, error: existingError } = await supabase
            .from('signal_analyses')
            .select('*')
            .eq('signal_id', id)
            .limit(1)
            .maybeSingle();

        if (existingError && existingError.code !== 'PGRST116') {
            throw existingError;
        }

        if (existing) {
            return res.status(200).json({
                message: "Analysis already exists for this signal.",
                analysis: existing,
                fromCache: true
            });
        }

        // 3. Run AI analysis
        logStructured("info", "signal_analyze_started", { signalId: id });
        const result = await analyzeSignal(signal.title, cleanSignalContent(signal.content));

        // 4. Save result to SignalAnalysis
        const { data: analysis, error: analysisError } = await supabase
            .from('signal_analyses')
            .insert({
                signal_id: id,
                analysis: JSON.stringify({
                    sentiment: result.sentiment,
                    narrative_type: result.narrative_type,
                    stakeholder: result.stakeholder,
                    impact: result.impact,
                    summary: result.summary,
                    recommended_action: result.recommended_action,
                }),
                confidence: result.confidence_score,
                model: "gpt-4o-mini",
            })
            .select()
            .single();

        if (analysisError) throw analysisError;

        // 5. Also update the signal's own sentiment field for quick access
        const { error: updateError } = await supabase
            .from('signals')
            .update({ sentiment: result.sentiment })
            .eq('id', id);

        if (updateError) throw updateError;

        logStructured("info", "signal_analyze_saved", { signalId: id });

        res.status(201).json({
            message: "Analysis completed and saved.",
            analysis,
            fromCache: false
        });

    } catch (error) {
        logStructured("error", "[ANALYZE] Error:", { error: error.message?.message || error.message, stack: error.message?.stack });
        res.status(500).json({ error: error.message });
    }
});

// POST /signals/batch-analyze — Analyze multiple signals at once
router.post("/batch-analyze", async (req, res) => {
    try {
        const { signalIds, workspaceId } = req.body;

        if (!signalIds || !Array.isArray(signalIds) || signalIds.length === 0) {
            return res.status(400).json({ error: "signalIds array is required." });
        }

        if (signalIds.length > 20) {
            return res.status(400).json({ error: "Maximum 20 signals per batch." });
        }

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const { data: signals, error: signalsError } = await supabase
            .from('signals')
            .select('*')
            .in('id', signalIds)
            .eq('workspace_id', scopedWorkspaceId);

        if (signalsError) throw signalsError;

        // Filter out signals that already have analysis
        const { data: existingAnalyses, error: analysesError } = await supabase
            .from('signal_analyses')
            .select('signal_id')
            .in('signal_id', signalIds);

        if (analysesError) throw analysesError;

        const analyzedIds = new Set((existingAnalyses || []).map((a) => a.signal_id));
        const unanalyzed = (signals || []).filter((s) => !analyzedIds.has(s.id));

        if (unanalyzed.length === 0) {
            return res.json({
                message: "All signals already have analysis.",
                analyzed: 0,
                skipped: signalIds.length,
                results: [],
            });
        }

        const results = [];
        for (const signal of unanalyzed) {
            try {
                const result = await analyzeSignal(signal.title, cleanSignalContent(signal.content));

                const { data: analysis, error: createError } = await supabase
                    .from('signal_analyses')
                    .insert({
                        signal_id: signal.id,
                        analysis: JSON.stringify({
                            sentiment: result.sentiment,
                            narrative_type: result.narrative_type,
                            stakeholder: result.stakeholder,
                            impact: result.impact,
                            summary: result.summary,
                            recommended_action: result.recommended_action,
                        }),
                        confidence: result.confidence_score,
                        model: "gpt-4o-mini",
                    })
                    .select()
                    .single();

                if (createError) throw createError;

                const { error: updateError } = await supabase
                    .from('signals')
                    .update({ sentiment: result.sentiment })
                    .eq('id', signal.id);

                if (updateError) throw updateError;

                results.push({ signalId: signal.id, status: "analyzed", analysis });
            } catch (error) {
                results.push({ signalId: signal.id, status: "failed", error: error.message });
            }
        }

        logStructured("info", "batch_analyze_completed", {
            total: signalIds.length,
            analyzed: results.filter((r) => r.status === "analyzed").length,
            failed: results.filter((r) => r.status === "failed").length,
            skipped: signalIds.length - unanalyzed.length,
        });

        res.json({
            message: "Batch analysis completed.",
            analyzed: results.filter((r) => r.status === "analyzed").length,
            failed: results.filter((r) => r.status === "failed").length,
            skipped: signalIds.length - unanalyzed.length,
            results,
        });
    } catch (error) {
        logStructured("error", "[BATCH-ANALYZE] Error:", { error: error.message?.message || error.message, stack: error.message?.stack });
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/signals/:id - Update a signal
router.patch("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        // Fetch signal to check ownership
        const { data: existingSignal, error: fetchError } = await supabase
            .from('signals')
            .select('workspace_id')
            .eq('id', id)
            .single();

        if (fetchError || !existingSignal) {
            return res.status(404).json({ error: "Signal not found" });
        }

        if (!workspaceIds.includes(existingSignal.workspace_id)) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Viewers read; owners, admins and analysts may correct a record.
        const role = await getWorkspaceRole(req.user.id, existingSignal.workspace_id);
        if (!role || role === "viewer") {
            return res.status(403).json({ error: "Your role cannot change records.", code: "ROLE_NOT_ALLOWED" });
        }

        // Allowed fields to update
        const { sentiment, severity, topics, metadata } = req.body;
        const updateData = {};

        if (sentiment !== undefined) {
            const value = String(sentiment).toUpperCase();
            if (!["POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED"].includes(value)) {
                return res.status(400).json({ error: "sentiment must be positive, negative, neutral or mixed", code: "INVALID_SENTIMENT" });
            }
            updateData.sentiment = value;
        }
        if (severity !== undefined) updateData.severity = severity;
        if (topics !== undefined) updateData.topics = topics;
        if (metadata !== undefined) updateData.metadata = metadata;
        if (updateData.sentiment) {
            // Marked as a person's correction, so it can be told apart from the AI's reading.
            const { data: current } = await supabase.from('signals').select('metadata, sentiment').eq('id', id).single();
            updateData.metadata = { ...(current?.metadata || {}), ...(updateData.metadata || {}), sentimentCorrected: { from: current?.sentiment ?? null, to: updateData.sentiment, by: req.user.id, at: new Date().toISOString() } };
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No valid fields to update" });
        }

        const { data: updatedSignal, error: updateError } = await supabase
            .from('signals')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        await recordAuditLog({
            userId: req.user.id,
            event: "signal_updated",
            workspaceId: existingSignal.workspace_id,
            metadata: { signalId: id, fields: Object.keys(updateData) }
        });

        res.json(updatedSignal);
    } catch (error) {
        logStructured("error", "Error updating signal:", { error: error.message || error, stack: error.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/signals/:id - Delete a signal
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        // Fetch signal to check ownership
        const { data: existingSignal, error: fetchError } = await supabase
            .from('signals')
            .select('workspace_id')
            .eq('id', id)
            .single();

        if (fetchError || !existingSignal) {
            return res.status(404).json({ error: "Signal not found" });
        }

        if (!workspaceIds.includes(existingSignal.workspace_id)) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Delete related analyses first (if any)
        await supabase
            .from('signal_analyses')
            .delete()
            .eq('signal_id', id);

        // Delete the signal
        const { error: deleteError } = await supabase
            .from('signals')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        await recordAuditLog({
            userId: req.user.id,
            event: "signal_deleted",
            workspaceId: existingSignal.workspace_id,
            metadata: { signalId: id }
        });

        res.json({ success: true, message: "Signal deleted" });
    } catch (error) {
        logStructured("error", "Error deleting signal:", { error: error.message || error, stack: error.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/signals - Bulk delete signals
router.delete("/", async (req, res) => {
    try {
        const { signalIds } = req.body;

        if (!signalIds || !Array.isArray(signalIds) || signalIds.length === 0) {
            return res.status(400).json({ error: "signalIds array is required" });
        }

        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        // Fetch signals to verify ownership
        const { data: signalsToDelete, error: fetchError } = await supabase
            .from('signals')
            .select('id, workspace_id')
            .in('id', signalIds);

        if (fetchError) throw fetchError;

        // Filter to only signals user owns
        const ownedSignalIds = (signalsToDelete || [])
            .filter(s => workspaceIds.includes(s.workspace_id))
            .map(s => s.id);

        if (ownedSignalIds.length === 0) {
            return res.status(403).json({ error: "No signals to delete" });
        }

        // Delete related analyses first
        await supabase
            .from('signal_analyses')
            .delete()
            .in('signal_id', ownedSignalIds);

        // Delete signals
        const { error: deleteError } = await supabase
            .from('signals')
            .delete()
            .in('id', ownedSignalIds);

        if (deleteError) throw deleteError;

        await recordAuditLog({
            userId: req.user.id,
            event: "signals_bulk_deleted",
            workspaceId: ownedSignalIds.length > 0 ? (signalsToDelete || [])[0]?.workspace_id : null,
            metadata: { signalIds: ownedSignalIds, count: ownedSignalIds.length }
        });

        res.json({
            success: true,
            deleted: ownedSignalIds.length,
            message: `${ownedSignalIds.length} signals deleted`
        });
    } catch (error) {
        logStructured("error", "Error bulk deleting signals:", { error: error.message || error, stack: error.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
