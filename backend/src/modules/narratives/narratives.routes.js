import express from "express";
import prisma from "../../prisma.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveScopedWorkspaceIds, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { compareClusterPeriods } from "../clustering/clustering.service.js";
import { logStructured } from "../../lib/logger.js";

const router = express.Router();
router.use(verifyToken);

function toNarrativeItem(cluster) {
    const signals = cluster.narrativeClusterSignals.map((ncs) => ncs.signal);
    const uniquePlatforms = new Set(signals.map((signal) => signal.platform).filter(Boolean));
    const confidenceValues = signals
        .flatMap((signal) => signal.analyses.map((analysis) => analysis.confidenceScore))
        .filter((value) => typeof value === "number");

    const avgConfidence = confidenceValues.length > 0
        ? Math.round((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length) * 100)
        : 72;

    const now = Date.now();
    const last24hCount = signals.filter((signal) => {
        if (!signal.capturedAt) return false;
        return now - new Date(signal.capturedAt).getTime() <= 24 * 60 * 60 * 1000;
    }).length;

    const velocity = cluster.signalCount > 0
        ? `+${Math.round((last24hCount / cluster.signalCount) * 100)}%`
        : "+0%";

    return {
        id: cluster.id,
        title: cluster.title,
        description: cluster.description || cluster.mainNarrative || "",
        sourceCount: uniquePlatforms.size || 0,
        confidence: avgConfidence,
        impact: (cluster.impact || "MEDIUM").toString(),
        velocity,
        recommendedFocus: cluster.mainNarrative || cluster.description || "Prioritize stakeholder messaging and monitor escalation.",
        signalCount: cluster.signalCount,
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

        const whereClause = {};
        if (sentiment) whereClause.sentiment = sentiment;
        if (impact) whereClause.impact = String(impact).toUpperCase();
        if (Number.isFinite(days) && days > 0) {
            whereClause.updatedAt = { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
        }
        whereClause.workspaceId = { in: scopedWorkspaceIds };

        const [data, total] = await Promise.all([
            prisma.narrativeCluster.findMany({
                where: whereClause,
                skip,
                take: safeLimit,
                orderBy: { updatedAt: "desc" },
                include: {
                    narrativeClusterSignals: {
                        include: {
                            signal: {
                                select: {
                                    id: true,
                                    title: true,
                                    platform: true,
                                    sentiment: true,
                                    capturedAt: true,
                                    analyses: {
                                        orderBy: { createdAt: "desc" },
                                        take: 1,
                                        select: {
                                            confidenceScore: true,
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }),
            prisma.narrativeCluster.count({ where: whereClause })
        ]);

        return res.json({
            data: data.map(toNarrativeItem),
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit)
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

        const cluster = await prisma.narrativeCluster.findUnique({
            where: { id },
            include: {
                narrativeClusterSignals: {
                    orderBy: { createdAt: "desc" },
                    include: {
                        signal: {
                            include: {
                                analyses: {
                                    orderBy: { createdAt: "desc" },
                                    take: 1
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!cluster || !scopedWorkspaceIds.includes(cluster.workspaceId)) {
            return res.status(404).json({ error: "Narrative cluster not found" });
        }

        const relatedSignals = cluster.narrativeClusterSignals.map((ncs) => ({
            id: ncs.signal.id,
            title: ncs.signal.title,
            content: ncs.signal.content,
            platform: ncs.signal.platform,
            url: ncs.signal.url,
            sentiment: ncs.signal.analyses[0]?.sentiment || ncs.signal.sentiment || "unanalyzed",
            impact: ncs.signal.analyses[0]?.impact || null,
            capturedAt: ncs.signal.capturedAt,
            publishedAt: ncs.signal.publishedAt
        }));

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
