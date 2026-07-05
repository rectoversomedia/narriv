import express from "express";
import supabase from "../../lib/supabase.js";
import { analyzeSignal } from "../ai/ai.service.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { getUserWorkspaceIds, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { createSignalBodySchema, signalIdParamsSchema } from "./signals.schema.js";
import { logStructured } from "../../lib/logger.js";
import { globalEvents } from "../app-notifications/app-notifications.events.js";

const router = express.Router();
router.use(verifyToken);


// GET semua data dengan pagination dan filtering
router.get("/", async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;

        const { keyword, platform, startDate, endDate, sentiment } = req.query;

        const safePage = Math.max(1, page);
        const safeLimit = Math.min(100, Math.max(1, limit));
        const skip = (safePage - 1) * safeLimit;

        // Build dynamic query using Supabase
        let query = supabase
            .from('signals')
            .select('*', { count: 'exact' })
            .in('workspace_id', workspaceIds);

        if (keyword) {
            // Supabase uses ilike for case-insensitive contains
            query = query.or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`);
        }

        if (platform) {
            query = query.eq('platform', platform);
        }

        if (sentiment) {
            query = query.ilike('sentiment', sentiment);
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

        const { data: signalsData, error: signalsError, count } = await query
            .order('captured_at', { ascending: false })
            .range(skip, skip + safeLimit - 1);

        if (signalsError) throw signalsError;

        res.json({
            data: signalsData || [],
            pagination: {
                page: safePage,
                limit: safeLimit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / safeLimit)
            }
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


// GET /meta - Dashboard metadata
router.get("/meta", async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const inClause = workspaceIds.map(id => `'${id}'`).join(',');

        // Fetch alerts
        const { data: rawAlerts, error: alertsError } = await supabase
            .from('alerts')
            .select('title, severity, created_at')
            .in('workspace_id', workspaceIds)
            .neq('status', 'resolved')
            .order('created_at', { ascending: false })
            .limit(3);

        if (alertsError) throw alertsError;

        const followUps = (rawAlerts || []).map(a => ({
            title: a.title,
            badge: (a.severity || 'info').toUpperCase(),
            meta: 'Latest updates pending',
            time: new Date(a.created_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }) + ' WIB',
            tone: a.severity === 'critical' ? 'red' : 'amber'
        }));

        // Fetch action plans
        const { data: rawActionPlans, error: actionPlansError } = await supabase
            .from('action_plans')
            .select('title, description, priority')
            .in('workspace_id', workspaceIds)
            .order('created_at', { ascending: false })
            .limit(4);

        if (actionPlansError) throw actionPlansError;

        const recommendations = (rawActionPlans || []).map(ap => ({
            title: ap.title,
            desc: ap.description,
            badge: ap.priority,
            tone: 'purple'
        }));

        // Platform counts - fetch all signals grouped by platform
        const { data: allSignals, error: signalsError } = await supabase
            .from('signals')
            .select('platform')
            .in('workspace_id', workspaceIds);

        if (signalsError) throw signalsError;

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

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: timelineData, error: timelineError } = await supabase
            .from('signals')
            .select('captured_at')
            .in('workspace_id', workspaceIds)
            .gte('captured_at', twentyFourHoursAgo);

        if (timelineError) throw timelineError;

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

        // Fetch cases
        const { data: rawCases, error: casesError } = await supabase
            .from('cases')
            .select('title, assigned_team, status')
            .in('workspace_id', workspaceIds)
            .order('created_at', { ascending: false })
            .limit(3);

        if (casesError) throw casesError;

        let investigationQueue = [];

        if (rawCases && rawCases.length > 0) {
            investigationQueue = rawCases.map(c => ({
                title: c.title,
                meta: 'Assigned to ' + (c.assigned_team || 'Ops Team'),
                badge: c.status,
                tone: c.status === 'open' ? 'amber' : 'blue'
            }));
        } else {
            // Fallback to alerts if no cases
            const { data: fallbackAlerts, error: fallbackError } = await supabase
                .from('alerts')
                .select('title, status')
                .in('workspace_id', workspaceIds)
                .order('created_at', { ascending: false })
                .limit(3);

            if (fallbackError) throw fallbackError;

            investigationQueue = (fallbackAlerts || []).map(a => ({
                title: a.title,
                meta: 'Assigned to Ops Team',
                badge: a.status,
                tone: a.status === 'open' ? 'amber' : 'blue'
            }));
        }

        // Count negative signals in 24h
        const { count: negativeCount, error: negativeError } = await supabase
            .from('signals')
            .select('*', { count: 'exact', head: true })
            .in('workspace_id', workspaceIds)
            .ilike('sentiment', 'NEGATIVE')
            .gte('captured_at', twentyFourHoursAgo);

        if (negativeError) throw negativeError;

        // Count critical alerts in 24h
        const { count: criticalCount, error: criticalError } = await supabase
            .from('alerts')
            .select('*', { count: 'exact', head: true })
            .in('workspace_id', workspaceIds)
            .in('severity', ['critical', 'high'])
            .gte('created_at', twentyFourHoursAgo);

        if (criticalError) throw criticalError;

        const negativeSignals24h = negativeCount || 0;
        const criticalAlerts24h = criticalCount || 0;

        const metrics = {
            totalSignals24h,
            negativeSignals24h,
            criticalSignals24h: criticalAlerts24h
        };

        const aiSummary = totalSignals24h === 0
            ? null
            : {
                title: "AI Signal Summary",
                content: {
                    en: `In the last 24 hours, ${totalSignals24h} signals were captured. ${negativeSignals24h} negative discussions detected.`,
                    id: `Dalam 24 jam terakhir, tertangkap ${totalSignals24h} sinyal. Ada ${negativeSignals24h} percakapan negatif yang terdeteksi.`
                },
                insight: {
                    en: `Narriv recommends investigating critical alerts and communicating proactively.`,
                    id: `Narriv merekomendasikan investigasi pada peringatan kritis dan melakukan komunikasi secara proaktif.`
                }
            };

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
            signal,
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
        const result = await analyzeSignal(signal.title, signal.content);

        // 4. Save result to SignalAnalysis
        const { data: analysis, error: analysisError } = await supabase
            .from('signal_analyses')
            .insert({
                signal_id: id,
                sentiment: result.sentiment,
                narrative_type: result.narrative_type,
                stakeholder: result.stakeholder,
                impact: result.impact,
                summary: result.summary,
                recommended_action: result.recommended_action,
                confidence_score: result.confidence_score
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
                const result = await analyzeSignal(signal.title, signal.content);

                const { data: analysis, error: createError } = await supabase
                    .from('signal_analyses')
                    .insert({
                        signal_id: signal.id,
                        sentiment: result.sentiment,
                        narrative_type: result.narrative_type,
                        stakeholder: result.stakeholder,
                        impact: result.impact,
                        summary: result.summary,
                        recommended_action: result.recommended_action,
                        confidence_score: result.confidence_score,
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

export default router;
