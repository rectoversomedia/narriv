import express from "express";
import supabase from "../../lib/supabase.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveScopedWorkspaceIds, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { runVisibilityAnalysis } from "./geo.service.js";
import { logStructured } from "../../lib/logger.js";
import { wrapAsync } from "../../lib/sentry.js";

const router = express.Router();
router.use(verifyToken);

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
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);
        if (scopedWorkspaceIds.length === 0) {
            return res.json({ score: 0, presence: 0, presenceMentions: "0 of 0", competitor: 0, prompts: [], geoActions: [] });
        }

        const { data: latest, error } = await supabase
            .from("ai_visibility_results")
            .select(`
                id,
                workspace_id,
                engine,
                query,
                result,
                score,
                created_at,
                prompt_test_runs (
                    id,
                    prompt,
                    response,
                    sentiment,
                    relevance_score,
                    metadata
                )
            `)
            .in("workspace_id", scopedWorkspaceIds)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

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

        const prompts = (latest.prompt_test_runs || []).map((row) => ({
            prompt: row.prompt,
            engine: row.metadata?.engine || latest.engine || "chatgpt",
            brand: row.metadata?.brand || (row.sentiment === "positive" ? "mentioned" : "unmentioned"),
            competitor: row.metadata?.competitor || "not mentioned",
            brandTone: row.metadata?.brand_tone || row.sentiment || "neutral",
            compTone: row.metadata?.comp_tone || "neutral",
        }));

        const totalPrompts = prompts.length;
        const mentionedCount = prompts.filter((p) => p.brand?.toLowerCase() === "mentioned").length;
        const presence = totalPrompts > 0 ? Math.round((mentionedCount / totalPrompts) * 100) : (latest.result?.brand_presence_rate ? Math.round(latest.result.brand_presence_rate * 100) : 0);
        const competitor = latest.result?.competitor_mention_rate ? Math.round(latest.result.competitor_mention_rate * 100) : 0;
        const visibilityScore = Number(latest.score ?? latest.result?.visibility_score ?? 0);

        res.json({
            score: visibilityScore,
            presence,
            presenceMentions: `${mentionedCount} of ${totalPrompts}`,
            competitor,
            prompts,
            geoActions: buildGeoActions({
                score: visibilityScore,
                competitor,
                hasWeakPrompts: mentionedCount < totalPrompts,
            }),
        });
    } catch (error) {
        logStructured("error", "Error fetching visibility data:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/visibility/summary — Latest visibility snapshot per engine
router.get("/summary", async (req, res) => {
    try {
        const { workspaceId } = req.query;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);
        if (scopedWorkspaceIds.length === 0) {
            return res.json({ kpis: { avg_visibility_score: 0, avg_brand_presence_rate: 0, avg_competitor_mention_rate: 0, engines_tracked: 0, total_analyses: 0 }, engine_breakdown: [] });
        }

        // Fetch the most recent result for each engine
        const { data: allResults, error } = await supabase
            .from("ai_visibility_results")
            .select("id, engine, score, result, query, created_at")
            .in("workspace_id", scopedWorkspaceIds)
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Group by engine, keep only the latest per engine
        const latestByEngine = {};
        (allResults || []).forEach(result => {
            const engineKey = result.engine || "chatgpt";
            if (!latestByEngine[engineKey]) {
                latestByEngine[engineKey] = result;
            }
        });

        const engines = Object.values(latestByEngine);

        // Calculate aggregate KPIs across all engines
        const totalEngines = engines.length;
        const avgVisibility = totalEngines > 0
            ? Math.round((engines.reduce((sum, e) => sum + Number(e.score || 0), 0) / totalEngines) * 100) / 100
            : 0;
        const avgBrandPresence = totalEngines > 0
            ? Math.round((engines.reduce((sum, e) => sum + (e.result?.brand_presence_rate || 0), 0) / totalEngines) * 1000) / 1000
            : 0;
        const avgCompetitorMention = totalEngines > 0
            ? Math.round((engines.reduce((sum, e) => sum + (e.result?.competitor_mention_rate || 0), 0) / totalEngines) * 1000) / 1000
            : 0;

        // Per-engine breakdown
        const engineBreakdown = engines.map(e => ({
            engineName: e.engine || "chatgpt",
            visibilityScore: Number(e.score || 0),
            brandPresenceRate: e.result?.brand_presence_rate || 0,
            competitorMentionRate: e.result?.competitor_mention_rate || 0,
            lastChecked: e.created_at,
            metadata: e.result?.metadata || {}
        }));

        res.json({
            kpis: {
                avg_visibility_score: avgVisibility,
                avg_brand_presence_rate: avgBrandPresence,
                avg_competitor_mention_rate: avgCompetitorMention,
                engines_tracked: totalEngines,
                total_analyses: (allResults || []).length
            },
            engine_breakdown: engineBreakdown
        });
    } catch (error) {
        logStructured("error", "Error fetching visibility summary:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/visibility/trends — Historical visibility data over time
router.get("/trends", async (req, res) => {
    try {
        const { workspaceId, engineName, days } = req.query;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);
        if (scopedWorkspaceIds.length === 0) {
            return res.json({ period: { from: new Date().toISOString(), to: new Date().toISOString(), days: parseInt(days, 10) || 30 }, trends: [], engine_trends: {} });
        }

        const lookbackDays = parseInt(days, 10) || 30;
        const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

        let query = supabase
            .from("ai_visibility_results")
            .select("id, engine, score, result, created_at")
            .in("workspace_id", scopedWorkspaceIds)
            .gte("created_at", since.toISOString())
            .order("created_at", { ascending: true });

        if (engineName) {
            query = query.eq("engine", engineName);
        }

        const { data: results, error } = await query;

        if (error) throw error;

        // Group by date for charting
        const trendMap = {};
        (results || []).forEach(r => {
            const dateKey = new Date(r.created_at).toISOString().split("T")[0];
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
                avg_visibility_score: Math.round((day.entries.reduce((s, e) => s + Number(e.score || 0), 0) / count) * 100) / 100,
                avg_brand_presence_rate: Math.round((day.entries.reduce((s, e) => s + (e.result?.brand_presence_rate || 0), 0) / count) * 1000) / 1000,
                avg_competitor_mention_rate: Math.round((day.entries.reduce((s, e) => s + (e.result?.competitor_mention_rate || 0), 0) / count) * 1000) / 1000,
                data_points: count
            };
        }).sort((a, b) => a.date.localeCompare(b.date));

        // Per-engine trend lines (for multi-line charts)
        const engineTrends = {};
        (results || []).forEach(r => {
            const engName = r.engine || "chatgpt";
            if (!engineTrends[engName]) engineTrends[engName] = [];
            engineTrends[engName].push({
                date: new Date(r.created_at).toISOString().split("T")[0],
                visibilityScore: Number(r.score || 0),
                brandPresenceRate: r.result?.brand_presence_rate || 0,
                competitorMentionRate: r.result?.competitor_mention_rate || 0
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
        logStructured("error", "Error fetching visibility trends:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/visibility/analyze — Trigger a new visibility analysis
router.post("/analyze", async (req, res) => {
    try {
        const { brandName, competitors, queries, engineName, workspaceId } = req.body;

        if (!brandName || !queries || !Array.isArray(queries) || queries.length === 0) {
            return res.status(400).json({ error: "brandName and queries array are required." });
        }

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const result = await runVisibilityAnalysis({
            workspaceId: scopedWorkspaceId,
            brandName,
            competitors: competitors || [],
            queries,
            engineName: engineName || "chatgpt",
        });

        res.status(201).json(result);
    } catch (error) {
        logStructured("error", "Error running visibility analysis:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
