import express from "express";
import prisma from "../../prisma.js";

const router = express.Router();

function buildGeoActions({ score, competitor, hasWeakPrompts }) {
    const actions = [];

    if (score < 60) {
        actions.push({
            title: "Create a plan to improve AI visibility",
            tag: "High impact",
            highlighted: true,
        });
    }

    if (competitor >= 45) {
        actions.push({
            title: "Publish comparative proof points for key prompts",
            tag: "Defensive",
        });
    }

    if (hasWeakPrompts) {
        actions.push({
            title: "Improve answer quality on unanswered prompts",
            tag: "Quick win",
        });
    }

    if (actions.length === 0) {
        actions.push({
            title: "Maintain prompt monitoring cadence",
            tag: "Stable",
        });
    }

    return actions;
}

// GET /api/visibility — Frontend contract endpoint
router.get("/", async (req, res) => {
    try {
        const { workspaceId } = req.query;
        const whereClause = workspaceId ? { workspaceId } : {};

        const latest = await prisma.aIVisibilityResult.findFirst({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            include: {
                promptTestRuns: {
                    orderBy: { createdAt: "asc" },
                    select: {
                        prompt: true,
                        engine: true,
                        brand: true,
                        competitor: true,
                        brandTone: true,
                        compTone: true,
                        highlighted: true,
                    }
                }
            }
        });

        if (!latest) {
            return res.json({
                score: 0,
                presence: 0,
                presenceMentions: "0 of 0",
                competitor: 0,
                prompts: [],
                geoActions: [],
            });
        }

        const prompts = latest.promptTestRuns.map((row) => ({
            prompt: row.prompt,
            engine: row.engine,
            brand: row.brand,
            competitor: row.competitor,
            brandTone: row.brandTone,
            compTone: row.compTone,
        }));

        const mentionedCount = latest.promptTestRuns.filter((row) => row.brand.toLowerCase() === "mentioned").length;
        const presence = Math.round(latest.brandPresenceRate * 100);
        const competitor = Math.round(latest.competitorMentionRate * 100);

        res.json({
            score: Number(latest.visibilityScore),
            presence,
            presenceMentions: `${mentionedCount} of ${latest.promptTestRuns.length}`,
            competitor,
            prompts,
            geoActions: buildGeoActions({
                score: Number(latest.visibilityScore),
                competitor,
                hasWeakPrompts: mentionedCount < latest.promptTestRuns.length,
            }),
        });
    } catch (error) {
        console.error("Error fetching visibility data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/visibility/summary — Latest visibility snapshot per engine
router.get("/summary", async (req, res) => {
    try {
        const { workspaceId } = req.query;

        const whereClause = {};
        if (workspaceId) whereClause.workspaceId = workspaceId;

        // Fetch the most recent result for each engine
        const allResults = await prisma.aIVisibilityResult.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" }
        });

        // Group by engine, keep only the latest per engine
        const latestByEngine = {};
        allResults.forEach(result => {
            if (!latestByEngine[result.engineName]) {
                latestByEngine[result.engineName] = result;
            }
        });

        const engines = Object.values(latestByEngine);

        // Calculate aggregate KPIs across all engines
        const totalEngines = engines.length;
        const avgVisibility = totalEngines > 0
            ? Math.round((engines.reduce((sum, e) => sum + e.visibilityScore, 0) / totalEngines) * 100) / 100
            : 0;
        const avgBrandPresence = totalEngines > 0
            ? Math.round((engines.reduce((sum, e) => sum + e.brandPresenceRate, 0) / totalEngines) * 1000) / 1000
            : 0;
        const avgCompetitorMention = totalEngines > 0
            ? Math.round((engines.reduce((sum, e) => sum + e.competitorMentionRate, 0) / totalEngines) * 1000) / 1000
            : 0;

        // Per-engine breakdown
        const engineBreakdown = engines.map(e => ({
            engineName: e.engineName,
            visibilityScore: e.visibilityScore,
            brandPresenceRate: e.brandPresenceRate,
            competitorMentionRate: e.competitorMentionRate,
            lastChecked: e.createdAt,
            metadata: e.metadata
        }));

        res.json({
            kpis: {
                avg_visibility_score: avgVisibility,
                avg_brand_presence_rate: avgBrandPresence,
                avg_competitor_mention_rate: avgCompetitorMention,
                engines_tracked: totalEngines,
                total_analyses: allResults.length
            },
            engine_breakdown: engineBreakdown
        });
    } catch (error) {
        console.error("Error fetching visibility summary:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/visibility/trends — Historical visibility data over time
router.get("/trends", async (req, res) => {
    try {
        const { workspaceId, engineName, days } = req.query;

        const lookbackDays = parseInt(days, 10) || 30;
        const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

        const whereClause = {
            createdAt: { gte: since }
        };
        if (workspaceId) whereClause.workspaceId = workspaceId;
        if (engineName) whereClause.engineName = engineName;

        const results = await prisma.aIVisibilityResult.findMany({
            where: whereClause,
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                engineName: true,
                visibilityScore: true,
                brandPresenceRate: true,
                competitorMentionRate: true,
                createdAt: true,
                metadata: true
            }
        });

        // Group by date for charting
        const trendMap = {};
        results.forEach(r => {
            const dateKey = new Date(r.createdAt).toISOString().split("T")[0];
            if (!trendMap[dateKey]) {
                trendMap[dateKey] = {
                    date: dateKey,
                    entries: [],
                    avgVisibility: 0,
                    avgBrandPresence: 0,
                    avgCompetitorMention: 0
                };
            }
            trendMap[dateKey].entries.push(r);
        });

        // Calculate daily averages
        const trends = Object.values(trendMap).map(day => {
            const count = day.entries.length;
            return {
                date: day.date,
                avg_visibility_score: Math.round((day.entries.reduce((s, e) => s + e.visibilityScore, 0) / count) * 100) / 100,
                avg_brand_presence_rate: Math.round((day.entries.reduce((s, e) => s + e.brandPresenceRate, 0) / count) * 1000) / 1000,
                avg_competitor_mention_rate: Math.round((day.entries.reduce((s, e) => s + e.competitorMentionRate, 0) / count) * 1000) / 1000,
                data_points: count
            };
        }).sort((a, b) => a.date.localeCompare(b.date));

        // Per-engine trend lines (for multi-line charts)
        const engineTrends = {};
        results.forEach(r => {
            if (!engineTrends[r.engineName]) engineTrends[r.engineName] = [];
            engineTrends[r.engineName].push({
                date: new Date(r.createdAt).toISOString().split("T")[0],
                visibilityScore: r.visibilityScore,
                brandPresenceRate: r.brandPresenceRate,
                competitorMentionRate: r.competitorMentionRate
            });
        });

        res.json({
            period: {
                from: since.toISOString(),
                to: new Date().toISOString(),
                days: lookbackDays
            },
            trends,
            engine_trends: engineTrends
        });
    } catch (error) {
        console.error("Error fetching visibility trends:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
