import prisma from "../../prisma.js";

// ─────────────────────────────────────────────────────────────────────────────
// REPORT GENERATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a full intelligence report for a workspace over a given period.
 *
 * @param {object} params
 * @param {string} params.workspaceId - The workspace ID.
 * @param {string} [params.title] - Custom report title.
 * @param {Date}   [params.periodStart] - Start of reporting period (default: 7 days ago).
 * @param {Date}   [params.periodEnd] - End of reporting period (default: now).
 * @returns {Promise<object>} - The saved Report record with full content.
 */
export async function generateReport({ workspaceId, title, periodStart, periodEnd }) {
    const now = new Date();
    const start = periodStart ? new Date(periodStart) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const end = periodEnd ? new Date(periodEnd) : now;

    console.log(`[REPORT] Generating report for workspace ${workspaceId}`);
    console.log(`[REPORT] Period: ${start.toISOString()} → ${end.toISOString()}`);

    // ── 1. Dashboard Metrics ─────────────────────────────────────────────────
    const signals = await prisma.signal.findMany({
        where: {
            workspaceId,
            capturedAt: { gte: start, lte: end }
        },
        include: {
            analyses: {
                orderBy: { createdAt: "desc" },
                take: 1
            }
        },
        orderBy: { capturedAt: "desc" }
    });

    const totalSignals = signals.length;

    // Sentiment distribution
    let positive = 0, negative = 0, neutral = 0, mixed = 0, unanalyzed = 0;
    const platformsMap = {};

    signals.forEach(signal => {
        const sentiment = signal.analyses[0]?.sentiment || signal.sentiment;
        if (sentiment) {
            const s = sentiment.toLowerCase();
            if (s === "positive") positive++;
            else if (s === "negative") negative++;
            else if (s === "neutral") neutral++;
            else if (s === "mixed") mixed++;
            else unanalyzed++;
        } else {
            unanalyzed++;
        }

        const platform = signal.platform || "unknown";
        platformsMap[platform] = (platformsMap[platform] || 0) + 1;
    });

    const analyzedCount = positive + negative + neutral + mixed;

    const dashboardMetrics = {
        total_signals: totalSignals,
        analyzed_signals: analyzedCount,
        sentiment_distribution: { positive, negative, neutral, mixed, unanalyzed },
        sentiment_percentages: {
            positive: analyzedCount ? Math.round((positive / analyzedCount) * 100) : 0,
            negative: analyzedCount ? Math.round((negative / analyzedCount) * 100) : 0,
            neutral: analyzedCount ? Math.round((neutral / analyzedCount) * 100) : 0,
            mixed: analyzedCount ? Math.round((mixed / analyzedCount) * 100) : 0
        },
        platform_distribution: Object.entries(platformsMap)
            .map(([platform, count]) => ({ platform, count }))
            .sort((a, b) => b.count - a.count),
        top_signals: signals.slice(0, 5).map(s => ({
            title: s.title || "Untitled",
            platform: s.platform || "unknown",
            sentiment: s.analyses[0]?.sentiment || s.sentiment || "unanalyzed",
            url: s.url,
            capturedAt: s.capturedAt
        }))
    };

    // ── 2. Alerts ────────────────────────────────────────────────────────────
    const alerts = await prisma.alert.findMany({
        where: {
            workspaceId,
            createdAt: { gte: start, lte: end }
        },
        orderBy: { createdAt: "desc" }
    });

    const alertsSummary = {
        total: alerts.length,
        by_severity: {
            critical: alerts.filter(a => a.severity === "critical").length,
            high: alerts.filter(a => a.severity === "high").length,
            medium: alerts.filter(a => a.severity === "medium").length,
            low: alerts.filter(a => a.severity === "low").length
        },
        by_status: {
            open: alerts.filter(a => a.status === "open").length,
            acknowledged: alerts.filter(a => a.status === "acknowledged").length,
            resolved: alerts.filter(a => a.status === "resolved").length
        },
        items: alerts.map(a => ({
            title: a.title,
            type: a.type,
            severity: a.severity,
            status: a.status,
            whatHappened: a.whatHappened,
            whyItMatters: a.whyItMatters,
            whatToDo: a.whatToDo,
            createdAt: a.createdAt
        }))
    };

    // ── 3. Narratives ────────────────────────────────────────────────────────
    const clusters = await prisma.narrativeCluster.findMany({
        where: {
            workspaceId,
            createdAt: { gte: start, lte: end }
        },
        orderBy: { signalCount: "desc" },
        include: {
            narrativeClusterSignals: {
                take: 3,
                include: {
                    signal: {
                        select: { title: true, platform: true, sentiment: true }
                    }
                }
            }
        }
    });

    const narrativesSummary = {
        total_clusters: clusters.length,
        items: clusters.map(c => ({
            title: c.title,
            description: c.description,
            mainNarrative: c.mainNarrative,
            sentiment: c.sentiment,
            impact: c.impact,
            signalCount: c.signalCount,
            sampleSignals: c.narrativeClusterSignals.map(ncs => ({
                title: ncs.signal.title,
                platform: ncs.signal.platform,
                sentiment: ncs.signal.sentiment
            }))
        }))
    };

    // ── 4. Build Report Summary Text ─────────────────────────────────────────
    const summaryLines = [];
    summaryLines.push(`Intelligence Report: ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}`);
    summaryLines.push(`Total Signals: ${totalSignals} | Analyzed: ${analyzedCount}`);

    if (analyzedCount > 0) {
        summaryLines.push(`Sentiment: ${dashboardMetrics.sentiment_percentages.positive}% positive, ${dashboardMetrics.sentiment_percentages.negative}% negative, ${dashboardMetrics.sentiment_percentages.neutral}% neutral`);
    }

    if (alerts.length > 0) {
        const criticalHigh = alertsSummary.by_severity.critical + alertsSummary.by_severity.high;
        summaryLines.push(`Alerts: ${alerts.length} total (${criticalHigh} critical/high)`);
    }

    if (clusters.length > 0) {
        summaryLines.push(`Narrative Clusters: ${clusters.length} identified`);
    }

    const reportSummary = summaryLines.join(". ") + ".";
    const reportTitle = title || `Intelligence Report — ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}`;

    // ── 5. Save Report ───────────────────────────────────────────────────────
    const report = await prisma.report.create({
        data: {
            workspaceId,
            title: reportTitle,
            periodStart: start,
            periodEnd: end,
            summary: reportSummary
        }
    });

    console.log(`[REPORT] Report saved: ${report.id}`);

    return {
        id: report.id,
        title: report.title,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        summary: report.summary,
        createdAt: report.createdAt,
        sections: {
            dashboard_metrics: dashboardMetrics,
            alerts: alertsSummary,
            narratives: narrativesSummary
        }
    };
}
