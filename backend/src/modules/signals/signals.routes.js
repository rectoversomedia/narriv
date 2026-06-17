import express from "express";
import prisma from "../../prisma.js";
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
        const safeLimit = Math.max(1, limit);
        const skip = (safePage - 1) * safeLimit;

        // Build dynamic where clause
        const whereClause = { workspaceId: { in: workspaceIds } };

        if (keyword) {
            whereClause.OR = [
                { title: { contains: keyword, mode: 'insensitive' } },
                { content: { contains: keyword, mode: 'insensitive' } }
            ];
        }

        if (platform) {
            whereClause.platform = platform;
        }

        if (sentiment) {
            whereClause.sentiment = { equals: sentiment, mode: 'insensitive' };
        }

        if (startDate || endDate) {
            whereClause.capturedAt = {};
            if (startDate) {
                const dateStart = new Date(startDate);
                if (isNaN(dateStart.getTime())) {
                    return res.status(400).json({ error: "Invalid startDate format. Use ISO-8601 or YYYY-MM-DD." });
                }
                whereClause.capturedAt.gte = dateStart;
            }
            if (endDate) {
                const dateEnd = new Date(endDate);
                if (isNaN(dateEnd.getTime())) {
                    return res.status(400).json({ error: "Invalid endDate format. Use ISO-8601 or YYYY-MM-DD." });
                }
                whereClause.capturedAt.lte = dateEnd;
            }
        }

        const [data, total] = await Promise.all([
            prisma.signal.findMany({
                where: whereClause,
                skip,
                take: safeLimit,
                orderBy: {
                    capturedAt: 'desc'
                }
            }),
            prisma.signal.count({
                where: whereClause
            })
        ]);

        res.json({
            data: data || [],
            pagination: {
                page: safePage,
                limit: safeLimit,
                total: total || 0,
                totalPages: Math.ceil((total || 0) / safeLimit)
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

        const newSignal = await prisma.signal.create({
            data: { workspaceId: targetWorkspaceId, content, sentiment },
        });

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
        const whereClause = { workspaceId: { in: workspaceIds } };

        const rawAlerts = await prisma.alert.findMany({
            where: { workspaceId: { in: workspaceIds }, status: { not: 'resolved' } },
            orderBy: { createdAt: 'desc' },
            take: 3
        });
        const followUps = rawAlerts.map(a => ({
            title: a.title,
            badge: (a.severity || 'info').toUpperCase(),
            meta: 'Latest updates pending',
            time: new Date(a.createdAt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }) + ' WIB',
            tone: a.severity === 'critical' ? 'red' : 'amber'
        }));

        const rawActionPlans = await prisma.actionPlan.findMany({
            where: { workspaceId: { in: workspaceIds } },
            orderBy: { createdAt: 'desc' },
            take: 4
        });
        const recommendations = rawActionPlans.map(ap => ({
            title: ap.title,
            desc: ap.description,
            badge: ap.priority,
            tone: 'purple'
        }));

        const platformCounts = await prisma.signal.groupBy({
            by: ['platform'],
            where: whereClause,
            _count: { _all: true }
        });
        const totalSignals = platformCounts.reduce((acc, curr) => acc + curr._count._all, 0);
        const predefinedColors = ['#465FFF', '#EF3F6B', '#10B981', '#8B5CFF', '#94A3B8'];
        const sourceDistribution = platformCounts.map((pc, idx) => {
            const percentage = totalSignals ? Math.round((pc._count._all / totalSignals) * 100) : 0;
            return {
                name: pc.platform || 'Unknown',
                value: `${percentage}% (${pc._count._all})`,
                color: predefinedColors[idx % predefinedColors.length]
            };
        });

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const timelineData = await prisma.signal.findMany({
            where: { ...whereClause, capturedAt: { gte: twentyFourHoursAgo } },
            select: { capturedAt: true }
        });

        const timeline = Array(24).fill(0);
        const timelineLabels = Array(24).fill('');
        
        const now = new Date();
        for (let i = 23; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 60 * 60 * 1000);
            timelineLabels[23 - i] = `${date.getHours().toString().padStart(2, '0')}:00`;
        }

        timelineData.forEach(sig => {
            const hDiff = Math.floor((now.getTime() - new Date(sig.capturedAt).getTime()) / (60 * 60 * 1000));
            if (hDiff >= 0 && hDiff < 24) {
                timeline[23 - hDiff]++;
            }
        });

        const totalSignals24h = timelineData.length;

        let rawCases = await prisma.case.findMany({
            where: { workspaceId: { in: workspaceIds } },
            orderBy: { createdAt: 'desc' },
            take: 3
        });
        let investigationQueue = [];
        
        if (rawCases.length > 0) {
            investigationQueue = rawCases.map(c => ({
                title: c.title,
                meta: 'Assigned to ' + (c.assignedTeam || 'Ops Team'),
                badge: c.status,
                tone: c.status === 'open' ? 'amber' : 'blue'
            }));
        } else {
            const fallbackAlerts = await prisma.alert.findMany({
                where: { workspaceId: { in: workspaceIds } },
                orderBy: { createdAt: 'desc' },
                take: 3
            });
            investigationQueue = fallbackAlerts.map(a => ({
                title: a.title,
                meta: 'Assigned to Ops Team',
                badge: a.status,
                tone: a.status === 'open' ? 'amber' : 'blue'
            }));
        }
        const negativeSignals24h = await prisma.signal.count({
            where: { ...whereClause, sentiment: { equals: 'NEGATIVE', mode: 'insensitive' }, capturedAt: { gte: twentyFourHoursAgo } }
        });
        const criticalAlerts24h = await prisma.alert.count({
            where: { workspaceId: { in: workspaceIds }, severity: { in: ['critical', 'high'] }, createdAt: { gte: twentyFourHoursAgo } }
        });

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

        const signal = await prisma.signal.findUnique({
            where: { id },
            include: {
                rawDocument: {
                    select: {
                        metadata: true
                    }
                }
            }
        });

        if (!signal || !workspaceIds.includes(signal.workspaceId)) {
            return res.status(404).json({ error: "Signal not found" });
        }

        // Fetch the most recent analysis for this signal
        const latestAnalysis = await prisma.signalAnalysis.findFirst({
            where: { signalId: id },
            orderBy: { createdAt: "desc" },
        });

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
        const signal = await prisma.signal.findUnique({ where: { id } });
        if (!signal || !workspaceIds.includes(signal.workspaceId)) {
            return res.status(404).json({ error: "Signal not found" });
        }

        // 2. Check for existing analysis — prevent duplicate inserts
        const existing = await prisma.signalAnalysis.findFirst({
            where: { signalId: id }
        });

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
        const analysis = await prisma.signalAnalysis.create({
            data: {
                signalId: id,
                sentiment: result.sentiment,
                narrativeType: result.narrative_type,
                stakeholder: result.stakeholder,
                impact: result.impact,
                summary: result.summary,
                recommendedAction: result.recommended_action,
                confidenceScore: result.confidence_score
            }
        });

        // 5. Also update the signal's own sentiment field for quick access
        await prisma.signal.update({
            where: { id },
            data: { sentiment: result.sentiment }
        });

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

        const signals = await prisma.signal.findMany({
            where: {
                id: { in: signalIds },
                workspaceId: scopedWorkspaceId,
            },
        });

        // Filter out signals that already have analysis
        const analyzedIds = new Set(
            (await prisma.signalAnalysis.findMany({
                where: { signalId: { in: signalIds } },
                select: { signalId: true },
            })).map((a) => a.signalId)
        );

        const unanalyzed = signals.filter((s) => !analyzedIds.has(s.id));

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

                const analysis = await prisma.signalAnalysis.create({
                    data: {
                        signalId: signal.id,
                        sentiment: result.sentiment,
                        narrativeType: result.narrative_type,
                        stakeholder: result.stakeholder,
                        impact: result.impact,
                        summary: result.summary,
                        recommendedAction: result.recommended_action,
                        confidenceScore: result.confidence_score,
                    },
                });

                await prisma.signal.update({
                    where: { id: signal.id },
                    data: { sentiment: result.sentiment },
                });

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
