import prisma from "../../prisma.js";

/**
 * Detects rule-based alerts for a given workspace.
 * 
 * Rules:
 * 1. Spike detection: If today's signals > 150% of yesterday -> create alert
 * 2. Negative sentiment spike: If negative > 40% -> create risk alert
 * 
 * @param {string} workspaceId 
 * @returns {Promise<Array>} Array of alert objects
 */
export async function detectAlerts(workspaceId) {
    const alerts = [];
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dayBeforeYesterday = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // -- Rule 1: Spike Detection --
    // Fetch current 24h volume
    const currentVolume = await prisma.signal.count({
        where: {
            workspaceId,
            capturedAt: {
                gte: yesterday,
                lte: now
            }
        }
    });

    // Fetch previous 24h volume
    const previousVolume = await prisma.signal.count({
        where: {
            workspaceId,
            capturedAt: {
                gte: dayBeforeYesterday,
                lt: yesterday
            }
        }
    });

    // Only alert if previous volume > 0 and current is > 150% of previous.
    // E.g., yesterday = 100, today = 151 -> Alert.
    // Also add a minimal baseline (e.g., > 10 signals) to prevent noise from very low volumes.
    if (previousVolume > 0 && currentVolume > previousVolume * 1.5) {
        alerts.push({
            workspaceId,
            type: "positioning", // Spike in volume relates to positioning/visibility
            severity: "medium",
            title: "Unusual Signal Volume Spike Detected",
            whatHappened: `Signal volume increased by ${Math.round(((currentVolume - previousVolume) / previousVolume) * 100)}% compared to yesterday.`,
            whyItMatters: "A sudden spike in mentions often indicates a viral event, breaking news, or a coordinated campaign.",
            whatToDo: "Review the latest signals to identify the driving narrative and decide if a public response is necessary.",
            status: "open",
            createdAt: new Date(),
        });
    }

    // -- Rule 2: Negative Sentiment Spike --
    // Fetch all signals from the last 24h that have a sentiment
    const recentSignals = await prisma.signal.findMany({
        where: {
            workspaceId,
            capturedAt: {
                gte: yesterday,
                lte: now
            },
            sentiment: {
                not: null
            }
        },
        select: { sentiment: true }
    });

    const totalAnalyzed = recentSignals.length;
    if (totalAnalyzed > 0) { // Require a minimum amount of data to be statistically relevant, e.g. > 5
        const negativeCount = recentSignals.filter(s => s.sentiment.toLowerCase() === "negative").length;
        const negativePercentage = (negativeCount / totalAnalyzed) * 100;

        if (negativePercentage > 40 && totalAnalyzed >= 5) {
            alerts.push({
                workspaceId,
                type: "risk",
                severity: "high",
                title: "Critical Negative Sentiment Spike",
                whatHappened: `Negative sentiment has reached ${Math.round(negativePercentage)}% of recent signals (over 40% threshold).`,
                whyItMatters: "High negative sentiment can severely damage brand reputation if left unchecked and often precedes a crisis.",
                whatToDo: "Immediately investigate the root cause of the negative signals and prepare a holding statement or mitigation strategy.",
                status: "open",
                createdAt: new Date(),
            });
        }
    }

    return alerts;
}
