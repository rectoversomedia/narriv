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

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    async function hasAlertToday(type) {
        const count = await prisma.alert.count({
            where: {
                workspaceId,
                type,
                createdAt: {
                    gte: startOfToday
                }
            }
        });
        return count > 0;
    }

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
    if (previousVolume > 0 && currentVolume > previousVolume * 1.5) {
        const type = "positioning";
        if (!(await hasAlertToday(type))) {
            const newAlert = await prisma.alert.create({
                data: {
                    workspaceId,
                    type,
                    severity: "medium",
                    title: "Signal Volume Spike",
                    whatHappened: `Volume increased by ${Math.round(((currentVolume - previousVolume) / previousVolume) * 100)}% vs yesterday.`,
                    whyItMatters: null,
                    whatToDo: null,
                    status: "open",
                }
            });
            alerts.push(newAlert);
        }
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
            const type = "risk";
            if (!(await hasAlertToday(type))) {
                const newAlert = await prisma.alert.create({
                    data: {
                        workspaceId,
                        type,
                        severity: "high",
                        title: "High Negative Sentiment",
                        whatHappened: `Negative sentiment reached ${Math.round(negativePercentage)}%.`,
                        whyItMatters: null,
                        whatToDo: null,
                        status: "open",
                    }
                });
                alerts.push(newAlert);
            }
        }
    }

    return alerts;
}
