import express from "express";
import prisma from "../../prisma.js";

const router = express.Router();

// GET /api/narratives — List all narrative clusters with pagination & filtering
router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const { sentiment, impact, workspaceId } = req.query;

        const safePage = Math.max(1, page);
        const safeLimit = Math.max(1, limit);
        const skip = (safePage - 1) * safeLimit;

        // Build dynamic where clause
        const whereClause = {};

        if (sentiment) {
            whereClause.sentiment = sentiment;
        }

        if (impact) {
            whereClause.impact = impact.toUpperCase();
        }

        if (workspaceId) {
            whereClause.workspaceId = workspaceId;
        }

        const [data, total] = await Promise.all([
            prisma.narrativeCluster.findMany({
                where: whereClause,
                skip,
                take: safeLimit,
                orderBy: { updatedAt: "desc" },
                include: {
                    // Include signal count and a preview of linked signals
                    narrativeClusterSignals: {
                        take: 3,
                        orderBy: { createdAt: "desc" },
                        include: {
                            signal: {
                                select: {
                                    id: true,
                                    title: true,
                                    platform: true,
                                    sentiment: true,
                                    capturedAt: true
                                }
                            }
                        }
                    }
                }
            }),
            prisma.narrativeCluster.count({ where: whereClause })
        ]);

        // Compute a simple trend indicator for each cluster
        const enrichedData = data.map(cluster => {
            const previewSignals = cluster.narrativeClusterSignals.map(ncs => ncs.signal);

            return {
                id: cluster.id,
                workspaceId: cluster.workspaceId,
                title: cluster.title,
                description: cluster.description,
                mainNarrative: cluster.mainNarrative,
                sentiment: cluster.sentiment,
                impact: cluster.impact,
                signalCount: cluster.signalCount,
                createdAt: cluster.createdAt,
                updatedAt: cluster.updatedAt,
                previewSignals
            };
        });

        res.json({
            data: enrichedData,
            meta: {
                page: safePage,
                limit: safeLimit,
                total: total || 0
            }
        });
    } catch (error) {
        console.error("Error fetching narratives:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/narratives/:id — Get full narrative detail with related signals and trends
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

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

        if (!cluster) {
            return res.status(404).json({ error: "Narrative cluster not found" });
        }

        // Extract full signal list
        const relatedSignals = cluster.narrativeClusterSignals.map(ncs => ({
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

        // Build a date-based trend from the related signals
        const trendMap = {};
        relatedSignals.forEach(signal => {
            if (!signal.capturedAt) return;
            const dateKey = new Date(signal.capturedAt).toISOString().split("T")[0]; // YYYY-MM-DD
            if (!trendMap[dateKey]) trendMap[dateKey] = 0;
            trendMap[dateKey]++;
        });

        const trends = Object.entries(trendMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Sentiment breakdown of related signals
        const sentimentBreakdown = relatedSignals.reduce((acc, s) => {
            const sent = s.sentiment || "unanalyzed";
            acc[sent] = (acc[sent] || 0) + 1;
            return acc;
        }, {});

        res.json({
            id: cluster.id,
            workspaceId: cluster.workspaceId,
            title: cluster.title,
            description: cluster.description,
            mainNarrative: cluster.mainNarrative,
            sentiment: cluster.sentiment,
            impact: cluster.impact,
            signalCount: cluster.signalCount,
            createdAt: cluster.createdAt,
            updatedAt: cluster.updatedAt,
            trends,
            sentimentBreakdown,
            relatedSignals
        });
    } catch (error) {
        console.error("Error fetching narrative:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
