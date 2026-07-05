import express from "express";
import supabase from "../../lib/supabase.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveScopedWorkspaceIds, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { compareClusterPeriods } from "../clustering/clustering.service.js";
import { logStructured } from "../../lib/logger.js";

const router = express.Router();
router.use(verifyToken);

function toNarrativeItem(cluster) {
    const signals = cluster.narrative_cluster_signals?.map((ncs) => ncs.signal) || [];
    const uniquePlatforms = new Set(signals.map((signal) => signal.platform).filter(Boolean));
    const confidenceValues = signals
        .flatMap((signal) => (signal.analyses || []).map((analysis) => analysis.confidence_score))
        .filter((value) => typeof value === "number");

    const avgConfidence = confidenceValues.length > 0
        ? Math.round((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length) * 100)
        : 72;

    const now = Date.now();
    const last24hCount = signals.filter((signal) => {
        if (!signal.captured_at) return false;
        return now - new Date(signal.captured_at).getTime() <= 24 * 60 * 60 * 1000;
    }).length;

    const velocity = cluster.signal_count > 0
        ? `+${Math.round((last24hCount / cluster.signal_count) * 100)}%`
        : "+0%";

    return {
        id: cluster.id,
        title: cluster.title,
        description: cluster.description || cluster.main_narrative || "",
        sourceCount: uniquePlatforms.size || 0,
        confidence: avgConfidence,
        impact: (cluster.impact || "MEDIUM").toString(),
        velocity,
        recommendedFocus: cluster.main_narrative || cluster.description || "Prioritize stakeholder messaging and monitor escalation.",
        signalCount: cluster.signal_count,
        sentiment: cluster.sentiment || "neutral",
    };
}

// GET /api/narratives - Frontend contract endpoint
router.get("/", async (req, res) => {
    try {
        const { sentiment, impact, workspaceId } = req.query;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const days = parseInt(req.query.days, 10);
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

        // Build where conditions for Supabase
        let query = supabase
            .from("narrative_clusters")
            .select(`
                *,
                narrative_cluster_signals (
                    signal:signals (
                        id,
                        title,
                        platform,
                        sentiment,
                        captured_at,
                        analyses (
                            confidence_score
                        )
                    )
                )
            `, { count: "exact" })
            .in("workspace_id", scopedWorkspaceIds)
            .order("updated_at", { ascending: false })
            .range(skip, skip + safeLimit - 1);

        if (sentiment) query = query.eq("sentiment", sentiment);
        if (impact) query = query.eq("impact", String(impact).toUpperCase());
        if (Number.isFinite(days) && days > 0) {
            const minDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
            query = query.gte("updated_at", minDate);
        }

        const { data: data, error, count } = await query;

        if (error) {
            logStructured("error", "Error fetching narratives:", { error: error.message || error });
            return res.status(500).json({ error: "Internal server error" });
        }

        return res.json({
            data: (data || []).map(toNarrativeItem),
            pagination: {
                page: safePage,
                limit: safeLimit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / safeLimit)
            }
        });
    } catch (error) {
        logStructured("error", "Error fetching narratives:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/narratives/compare — Compare clusters across two time periods
router.get("/compare", async (req, res) => {
    try {
        const { period1Start, period1End, period2Start, period2End, workspaceId } = req.query;

        if (!period1Start || !period1End || !period2Start || !period2End) {
            return res.status(400).json({ error: "All four period dates are required." });
        }

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const result = await compareClusterPeriods(
            scopedWorkspaceId,
            new Date(period1Start),
            new Date(period1End),
            new Date(period2Start),
            new Date(period2End)
        );

        return res.json(result);
    } catch (error) {
        logStructured("error", "Error comparing clusters:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/narratives/:id - Detailed narrative for topic detail panel
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        const { data: cluster, error } = await supabase
            .from("narrative_clusters")
            .select(`
                *,
                narrative_cluster_signals (
                    created_at,
                    signal:signals (
                        id,
                        title,
                        content,
                        platform,
                        url,
                        sentiment,
                        captured_at,
                        published_at,
                        analyses (
                            sentiment,
                            impact,
                            created_at
                        )
                    )
                )
            `)
            .eq("id", id)
            .maybeSingle();

        if (error) {
            logStructured("error", "Error fetching narrative:", { error: error.message || error });
            return res.status(500).json({ error: "Internal server error" });
        }

        if (!cluster || !scopedWorkspaceIds.includes(cluster.workspace_id)) {
            return res.status(404).json({ error: "Narrative cluster not found" });
        }

        const relatedSignals = (cluster.narrative_cluster_signals || [])
            .filter((ncs) => ncs.signal)
            .map((ncs) => {
                const analyses = ncs.signal.analyses || [];
                const latestAnalysis = analyses.sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0];
                return {
                    id: ncs.signal.id,
                    title: ncs.signal.title,
                    content: ncs.signal.content,
                    platform: ncs.signal.platform,
                    url: ncs.signal.url,
                    sentiment: latestAnalysis?.sentiment || ncs.signal.sentiment || "unanalyzed",
                    impact: latestAnalysis?.impact || null,
                    capturedAt: ncs.signal.captured_at,
                    publishedAt: ncs.signal.published_at
                };
            });

        const trendMap = {};
        relatedSignals.forEach((signal) => {
            if (!signal.capturedAt) return;
            const dateKey = new Date(signal.capturedAt).toISOString().split("T")[0];
            if (!trendMap[dateKey]) trendMap[dateKey] = 0;
            trendMap[dateKey]++;
        });

        const trends = Object.entries(trendMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const sentimentBreakdown = relatedSignals.reduce((acc, signal) => {
            const sent = signal.sentiment || "unanalyzed";
            acc[sent] = (acc[sent] || 0) + 1;
            return acc;
        }, {});

        return res.json({
            ...toNarrativeItem(cluster),
            trends,
            sentimentBreakdown,
            relatedSignals
        });
    } catch (error) {
        logStructured("error", "Error fetching narrative:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
