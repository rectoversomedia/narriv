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
            }
        });

        const totalSignals = signals.length;

        let positive = 0;
        let negative = 0;
        let neutral = 0;
        let analyzedCount = 0;

        signals.forEach(signal => {
            // Get sentiment from latest analysis, fallback to signal.sentiment
            const sentiment = signal.analyses[0]?.sentiment || signal.sentiment;

            if (sentiment) {
                analyzedCount++;
                const s = sentiment.toLowerCase();
                if (s === 'positive') positive++;
                else if (s === 'negative') negative++;
                else if (s === 'neutral') neutral++;
            }
        });

        const response = {
            kpis: {
                total_signals: totalSignals,
                analyzed_signals: analyzedCount,
                positive_percentage: analyzedCount ? Math.round((positive / analyzedCount) * 100) : 0,
                negative_percentage: analyzedCount ? Math.round((negative / analyzedCount) * 100) : 0,
                neutral_percentage: analyzedCount ? Math.round((neutral / analyzedCount) * 100) : 0
            },
            trends: [],
            distribution: {
                positive,
                negative,
                neutral
            },
            latest_signals: []
        };
        
        res.status(200).json(response);
    } catch (error) {
        console.error("Error in getSummary:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
