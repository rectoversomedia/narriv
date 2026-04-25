import prisma from "../../prisma.js";

export const getSummary = async (req, res) => {
    try {
        // Query signals table and join with signal_analysis
        const signals = await prisma.signal.findMany({
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
            // Get sentiment from latest analysis, fallback to signal.sentiment
            const sentiment = signal.analyses[0]?.sentiment || signal.sentiment;

            if (sentiment) {
                analyzedCount++;
                const s = sentiment.toLowerCase();
                if (s === 'positive') positive++;
                else if (s === 'negative') negative++;
                else if (s === 'neutral') neutral++;
                else if (s === 'mixed') mixed++;
            }

            // Platform distribution logic
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

        const trendsRaw = await prisma.$queryRaw`
            SELECT TO_CHAR("capturedAt", 'YYYY-MM-DD') as date, CAST(COUNT(*) AS INTEGER) as count
            FROM "Signal"
            WHERE "capturedAt" IS NOT NULL
            GROUP BY TO_CHAR("capturedAt", 'YYYY-MM-DD')
            ORDER BY date ASC
        `;

        const response = {
            kpis: {
                total_signals: totalSignals,
                analyzed_signals: analyzedCount,
                positive_percentage: analyzedCount ? Math.round((positive / analyzedCount) * 100) : 0,
                negative_percentage: analyzedCount ? Math.round((negative / analyzedCount) * 100) : 0,
                neutral_percentage: analyzedCount ? Math.round((neutral / analyzedCount) * 100) : 0,
                mixed_percentage: analyzedCount ? Math.round((mixed / analyzedCount) * 100) : 0
            },
            trends: trendsRaw,
            distribution: {
                positive,
                negative,
                neutral,
                mixed
            },
            platform_distribution,
            latest_signals
        };
        
        res.status(200).json(response);
    } catch (error) {
        console.error("Error in getSummary:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
