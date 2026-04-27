import prisma from "../../prisma.js";
import { enhanceAlert } from "../ai/ai.service.js";

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
    console.log(`[ALERTS] Checking Rule 1 (Spike) for workspace: ${workspaceId}`);
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

    console.log(`[ALERTS] Volume: Current=${currentVolume}, Previous=${previousVolume}`);

    // Only alert if previous volume > 0 and current is > 150% of previous.
    if (previousVolume > 0 && currentVolume > previousVolume * 1.5) {
        const type = "positioning";
        if (!(await hasAlertToday(type))) {
            console.log(`[ALERTS] Spike detected! Fetching context for AI...`);
            const topSignals = await prisma.signal.findMany({
                where: { workspaceId, capturedAt: { gte: yesterday, lte: now } },
                orderBy: { capturedAt: 'desc' },
                take: 5,
                select: { title: true, content: true, sentiment: true }
            });
            const signalsContext = topSignals.map(s => `[${s.sentiment || 'UNKNOWN'}] ${s.title || 'No Title'}\n${s.content.substring(0, 150)}...`).join("\n\n");

            const alertDataObj = {
                type,
                severity: "medium",
                title: "Signal Volume Spike",
                whatHappened: `Volume increased by ${Math.round(((currentVolume - previousVolume) / previousVolume) * 100)}% vs yesterday.`
            };

            const enhanced = await enhanceAlert(alertDataObj, signalsContext);

            const newAlert = await prisma.alert.create({
                data: {
                    workspaceId,
                    type: alertDataObj.type,
                    severity: alertDataObj.severity,
                    title: alertDataObj.title,
                    whatHappened: alertDataObj.whatHappened,
                    whyItMatters: enhanced ? enhanced.whyItMatters : null,
                    whatToDo: enhanced ? enhanced.whatToDo : null,
                    status: "open",
                }
            });
            console.log(`[ALERTS] Created Spike Alert: ${newAlert.id}`);
            alerts.push(newAlert);
        } else {
            console.log(`[ALERTS] Spike detected but alert of type ${type} already exists for today. Skipping.`);
        }
    }

    // -- Rule 2: Negative Sentiment Spike --
    console.log(`[ALERTS] Checking Rule 2 (Sentiment) for workspace: ${workspaceId}`);
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

        console.log(`[ALERTS] Sentiment: Total=${totalAnalyzed}, Negative=${negativeCount} (${Math.round(negativePercentage)}%)`);

        if (negativePercentage > 40 && totalAnalyzed >= 5) {
            const type = "risk";
            if (!(await hasAlertToday(type))) {
                console.log(`[ALERTS] Negative sentiment spike detected! Fetching context for AI...`);
                const topNegativeSignals = await prisma.signal.findMany({
                    where: { 
                        workspaceId, 
                        sentiment: { contains: "negative", mode: "insensitive" }, 
                        capturedAt: { gte: yesterday, lte: now } 
                    },
                    orderBy: { capturedAt: 'desc' },
                    take: 5,
                    select: { title: true, content: true }
                });
                const signalsContext = topNegativeSignals.map(s => `[NEGATIVE] ${s.title || 'No Title'}\n${s.content.substring(0, 150)}...`).join("\n\n");

                const alertDataObj = {
                    type,
                    severity: "high",
                    title: "High Negative Sentiment",
                    whatHappened: `Negative sentiment reached ${Math.round(negativePercentage)}%.`
                };

                const enhanced = await enhanceAlert(alertDataObj, signalsContext);

                const newAlert = await prisma.alert.create({
                    data: {
                        workspaceId,
                        type: alertDataObj.type,
                        severity: alertDataObj.severity,
                        title: alertDataObj.title,
                        whatHappened: alertDataObj.whatHappened,
                        whyItMatters: enhanced ? enhanced.whyItMatters : null,
                        whatToDo: enhanced ? enhanced.whatToDo : null,
                        status: "open",
                    }
                });
                console.log(`[ALERTS] Created Sentiment Alert: ${newAlert.id}`);
                alerts.push(newAlert);
            } else {
                console.log(`[ALERTS] Sentiment spike detected but alert of type ${type} already exists for today. Skipping.`);
            }
        }
    }

    return alerts;
}
