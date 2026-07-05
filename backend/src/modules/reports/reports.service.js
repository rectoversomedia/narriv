import supabase from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";

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

    logStructured("info", "report_generating", { workspaceId, periodStart: start.toISOString(), periodEnd: end.toISOString() });

    // ── 1. Dashboard Metrics ─────────────────────────────────────────────────
    const { data: signals } = await supabase
        .from("signals")
        .select("*, analyses:signal_analyses(*)")
        .eq("workspace_id", workspaceId)
        .gte("captured_at", start.toISOString())
        .lte("captured_at", end.toISOString())
        .order("captured_at", { ascending: false });

    const signalsList = signals || [];
    const totalSignals = signalsList.length;

    // Sentiment distribution
    let positive = 0, negative = 0, neutral = 0, mixed = 0, unanalyzed = 0;
    const platformsMap = {};

    signalsList.forEach(signal => {
        const analyses = signal.analyses || [];
        const latestAnalysis = analyses[0];
        const sentiment = latestAnalysis?.sentiment || signal.sentiment;
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
        top_signals: signalsList.slice(0, 5).map(s => {
            const analyses = s.analyses || [];
            const latestAnalysis = analyses[0];
            return {
                title: s.title || "Untitled",
                platform: s.platform || "unknown",
                sentiment: latestAnalysis?.sentiment || s.sentiment || "unanalyzed",
                url: s.url,
                capturedAt: s.captured_at
            };
        })
    };

    // ── 2. Alerts ────────────────────────────────────────────────────────────
    const { data: alerts } = await supabase
        .from("alerts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });

    const alertsList = alerts || [];

    const alertsSummary = {
        total: alertsList.length,
        by_severity: {
            critical: alertsList.filter(a => a.severity === "critical").length,
            high: alertsList.filter(a => a.severity === "high").length,
            medium: alertsList.filter(a => a.severity === "medium").length,
            low: alertsList.filter(a => a.severity === "low").length
        },
        by_status: {
            open: alertsList.filter(a => a.status === "open").length,
            acknowledged: alertsList.filter(a => a.status === "acknowledged").length,
            resolved: alertsList.filter(a => a.status === "resolved").length
        },
        items: alertsList.map(a => ({
            title: a.title,
            type: a.type,
            severity: a.severity,
            status: a.status,
            whatHappened: a.what_happened,
            whyItMatters: a.why_it_matters,
            whatToDo: a.what_to_do,
            createdAt: a.created_at
        }))
    };

    // ── 3. Narratives ────────────────────────────────────────────────────────
    const { data: clusters } = await supabase
        .from("narrative_clusters")
        .select(`
            *,
            narrative_cluster_signals:narrative_cluster_signals(
                *,
                signal:signals(title, platform, sentiment)
            )
        `)
        .eq("workspace_id", workspaceId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("signal_count", { ascending: false });

    const clustersList = clusters || [];

    const narrativesSummary = {
        total_clusters: clustersList.length,
        items: clustersList.map(c => {
            const clusterSignals = c.narrative_cluster_signals || [];
            return {
                title: c.title,
                description: c.description,
                mainNarrative: c.main_narrative,
                sentiment: c.sentiment,
                impact: c.impact,
                signalCount: c.signal_count,
                sampleSignals: clusterSignals.slice(0, 3).map(ncs => ({
                    title: ncs.signal?.title,
                    platform: ncs.signal?.platform,
                    sentiment: ncs.signal?.sentiment
                }))
            };
        })
    };

    // ── 4. Build Report Summary Text ─────────────────────────────────────────
    const summaryLines = [];
    summaryLines.push(`Intelligence Report: ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}`);
    summaryLines.push(`Total Signals: ${totalSignals} | Analyzed: ${analyzedCount}`);

    if (analyzedCount > 0) {
        summaryLines.push(`Sentiment: ${dashboardMetrics.sentiment_percentages.positive}% positive, ${dashboardMetrics.sentiment_percentages.negative}% negative, ${dashboardMetrics.sentiment_percentages.neutral}% neutral`);
    }

    if (alertsList.length > 0) {
        const criticalHigh = alertsSummary.by_severity.critical + alertsSummary.by_severity.high;
        summaryLines.push(`Alerts: ${alertsList.length} total (${criticalHigh} critical/high)`);
    }

    if (clustersList.length > 0) {
        summaryLines.push(`Narrative Clusters: ${clustersList.length} identified`);
    }

    const reportSummary = summaryLines.join(". ") + ".";
    const reportTitle = title || `Intelligence Report — ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}`;

    // ── 5. Save Report ───────────────────────────────────────────────────────
    const { data: report, error: reportError } = await supabase
        .from("reports")
        .insert({
            workspace_id: workspaceId,
            title: reportTitle,
            period_start: start.toISOString(),
            period_end: end.toISOString(),
            summary: reportSummary
        })
        .select()
        .single();

    if (reportError || !report) {
        logStructured("error", "report_save_failed", { error: reportError?.message });
        throw reportError || new Error("Failed to create report");
    }

    logStructured("info", "report_saved", { reportId: report.id });

    return {
        id: report.id,
        title: report.title,
        periodStart: report.period_start,
        periodEnd: report.period_end,
        summary: report.summary,
        createdAt: report.created_at,
        sections: {
            dashboard_metrics: dashboardMetrics,
            alerts: alertsSummary,
            narratives: narrativesSummary
        }
    };
}
