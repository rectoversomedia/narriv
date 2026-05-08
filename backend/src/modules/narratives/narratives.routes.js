import express from "express";
import prisma from "../../prisma.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveScopedWorkspaceIds } from "../../lib/workspace-access.js";

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
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);
        if (scopedWorkspaceIds.length === 0) return res.json({ narratives: [] });

        const whereClause = {};
        if (sentiment) whereClause.sentiment = sentiment;
        if (impact) whereClause.impact = String(impact).toUpperCase();
        whereClause.workspaceId = { in: scopedWorkspaceIds };

        const data = await prisma.narrativeCluster.findMany({
            where: whereClause,
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
        });

        return res.json({
            narratives: data.map(toNarrativeItem),
        });
    } catch (error) {
        console.error("Error fetching narratives:", error);
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
        console.error("Error fetching narrative:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
