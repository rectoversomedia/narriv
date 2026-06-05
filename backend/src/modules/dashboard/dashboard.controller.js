import prisma from "../../prisma.js";
import { getUserWorkspaceIds } from "../../lib/workspace-access.js";
import { cachedQuery, CACHE_KEYS, CACHE_TTL } from "../../lib/cache.js";
import redis from "../../lib/redis.js";

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
                    if (!isNaN(dateStart.getTime())) {
                        where.capturedAt.gte = dateStart;
                    }
                }
                if (endDate) {
                    const dateEnd = new Date(endDate);
                    if (!isNaN(dateEnd.getTime())) {
                        where.capturedAt.lte = dateEnd;
                    }
                }
            }

            const signals = await prisma.signal.findMany({
                where,
                include: {
                    analyses: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                },
                orderBy: { capturedAt: 'desc' }
            });

            const totalSignals = signals.length;

            let positive = 0, negative = 0, neutral = 0, mixed = 0, analyzedCount = 0;
            const platformsMap = {};

            signals.forEach(signal => {
                const sentiment = signal.analyses[0]?.sentiment || signal.sentiment;
                if (sentiment) {
                    analyzedCount++;
                    const s = sentiment.toLowerCase();
                    if (s.includes('positive')) positive++;
                    else if (s.includes('negative')) negative++;
                    else if (s.includes('neutral')) neutral++;
                    else if (s.includes('mixed')) mixed++;
                }

                const platform = signal.platform || 'unknown';
                platformsMap[platform] = (platformsMap[platform] || 0) + 1;
            });

            const platform_distribution = Object.keys(platformsMap)
                .map(platform => ({ platform, count: platformsMap[platform] }))
                .sort((a, b) => b.count - a.count);

            const latest_signals = signals.slice(0, 10).map(signal => ({
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

            // Fetch narrative clusters for topics
            const clusters = await prisma.narrativeCluster.findMany({
                where: { workspaceId: { in: workspaceIds } },
                orderBy: { signalCount: 'desc' },
                take: 10
            });

            const top_topics = clusters.slice(0, 5).map(c => ({
                name: { en: c.title, id: c.title },
                mentions: String(c.signalCount),
                delta: c.sentiment?.toLowerCase() === 'negative' ? "+12%" : "+5%", // Mock delta
                tone: c.sentiment?.toLowerCase() === 'negative' ? "red" : "green"
            }));

            const mini_topics = clusters.slice(0, 6).map((c, index) => {
                const tones = ["purple", "blue", "green", "amber", "red", "slate"];
                return {
                    label: c.title,
                    value: String(c.signalCount),
                    tone: tones[index % tones.length]
                };
            });

            // Fetch sources for health
            const sourceList = await prisma.source.findMany({
                where: { workspaceId: { in: workspaceIds } },
                take: 5
            });

            const sources_health = await Promise.all(sourceList.map(async (src) => {
                const signalCount = await prisma.rawDocument.count({ where: { sourceId: src.id } });
                return {
                    name: src.name,
                    status: src.isActive ? { en: "Active", id: "Aktif" } : { en: "Inactive", id: "Tidak Aktif" },
                    health: src.healthStatus === "unhealthy" ? { en: "Issue", id: "Bermasalah" } : { en: "Good", id: "Baik" },
                    signals: String(signalCount),
                    tone: src.isActive ? "green" : "slate"
                };
            }));

            // Check system status
            const system_status = ["API Server"];
            try {
                await prisma.$queryRaw`SELECT 1`;
                system_status.push("Database");
            } catch (e) {}

            try {
                if (redis.status === "ready") system_status.push("Redis Queue");
            } catch (e) {}
            
            system_status.push("OpenAI Integration");

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
                sentiment_distribution: { positive, negative, neutral, mixed },
                platform_distribution,
                latest_signals,
                top_topics,
                mini_topics,
                sources_health,
                system_status
            };
        });

        if (!response) {
            return res.status(400).json({ error: "Invalid date parameters" });
        }

        res.status(200).json(response);
    } catch (error) {
        logStructured("error", "Error in getSummary:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
