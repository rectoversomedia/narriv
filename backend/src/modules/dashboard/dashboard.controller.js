import prisma from "../../prisma.js";
import { getUserWorkspaceIds } from "../../lib/workspace-access.js";
import { cachedQuery, CACHE_KEYS, CACHE_TTL } from "../../lib/cache.js";

export const getSummary = async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0] || "default";
        const { startDate, endDate } = req.query;
        const rangeKey = `${startDate || "all"}_${endDate || "all"}`;

        const cacheKey = CACHE_KEYS.dashboard(workspaceId, rangeKey);

        const response = await cachedQuery(cacheKey, CACHE_TTL.dashboard, async () => {
            const where = { workspaceId: { in: workspaceIds } };

            if (startDate || endDate) {
                where.capturedAt = {};
                if (startDate) {
                    const dateStart = new Date(startDate);
                    if (isNaN(dateStart.getTime())) {
                        return null;
                    }
                    where.capturedAt.gte = dateStart;
                }
                if (endDate) {
                    const dateEnd = new Date(endDate);
                    if (isNaN(dateEnd.getTime())) {
                        return null;
                    }
                    where.capturedAt.lte = dateEnd;
                }
            }

            const signals = await prisma.signal.findMany({
                where,
                include: {
                    analyses: {
                        orderBy: {
                            createdAt: 'desc'
                        },
                        take: 1
                    }
                },
                orderBy: {
                    capturedAt: 'desc'
                }
            });

            const totalSignals = signals.length;

            let positive = 0;
            let negative = 0;
            let neutral = 0;
            let mixed = 0;
            let analyzedCount = 0;
            
            const platformsMap = {};

            signals.forEach(signal => {
                const sentiment = signal.analyses[0]?.sentiment || signal.sentiment;

                if (sentiment) {
                    analyzedCount++;
                    const s = sentiment.toLowerCase();
                    if (s === 'positive') positive++;
                    else if (s === 'negative') negative++;
                    else if (s === 'neutral') neutral++;
                    else if (s === 'mixed') mixed++;
                }

                const platform = signal.platform || 'unknown';
                if (!platformsMap[platform]) platformsMap[platform] = 0;
                platformsMap[platform]++;
            });

            const platform_distribution = Object.keys(platformsMap).map(platform => ({
                platform,
                count: platformsMap[platform]
            })).sort((a, b) => b.count - a.count);

            const latest_signals = signals.slice(0, 5).map(signal => ({
                id: signal.id,
                title: signal.title || "Untitled Signal",
                platform: signal.platform || "unknown",
                sentiment: signal.analyses[0]?.sentiment || signal.sentiment || "unanalyzed",
                published_at: signal.publishedAt || signal.capturedAt
            }));

            const trendMap = {};
            signals.forEach((signal) => {
                if (!signal.capturedAt) return;
                const date = new Date(signal.capturedAt).toISOString().split("T")[0];
                trendMap[date] = (trendMap[date] || 0) + 1;
            });
            const trends = Object.entries(trendMap)
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => a.date.localeCompare(b.date));

            return {
                kpis: {
                    total_signals: totalSignals,
                    analyzed_signals: analyzedCount,
                    positive_percentage: analyzedCount ? Math.round((positive / analyzedCount) * 100) : 0,
                    negative_percentage: analyzedCount ? Math.round((negative / analyzedCount) * 100) : 0,
                    neutral_percentage: analyzedCount ? Math.round((neutral / analyzedCount) * 100) : 0,
                    mixed_percentage: analyzedCount ? Math.round((mixed / analyzedCount) * 100) : 0
                },
                trends,
                sentiment_distribution: {
                    positive,
                    negative,
                    neutral,
                    mixed
                },
                platform_distribution,
                latest_signals
            };
        });

        if (!response) {
            return res.status(400).json({ error: "Invalid date parameters" });
        }

        res.status(200).json(response);
    } catch (error) {
        console.error("Error in getSummary:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
