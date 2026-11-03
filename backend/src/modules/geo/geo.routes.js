import express from "express";
import { tr } from "../../lib/request-context.js";
import supabase from "../../lib/supabase.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveScopedWorkspaceIds, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { runVisibilityAnalysis } from "./geo.service.js";
import { engineKeyFor, engineStatus, GEO_ENGINES, isEngineConfigured } from "./geo-engines.js";
import { generatePromptVariants } from "./geo-prompts.service.js";
import { requireWorkspaceRole, MANAGER_ROLES } from "../../lib/workspace-access.js";
import { logStructured } from "../../lib/logger.js";
import { wrapAsync } from "../../lib/sentry.js";

const router = express.Router();
router.use(verifyToken);

function buildGeoActions({ score, competitor, hasWeakPrompts }) {
    const actions = [];

    if (score < 60) {
        actions.push({
            title: tr("Create a plan to improve AI visibility", "Susun rencana untuk meningkatkan visibilitas di AI"),
            tag: tr("High impact", "Dampak tinggi"),
            highlighted: true,
        });
    }

    if (competitor >= 45) {
        actions.push({
            title: tr("Publish comparative proof points for key prompts", "Terbitkan bukti pembanding untuk prompt utama"),
            tag: tr("Defensive", "Defensif"),
        });
    }

    if (hasWeakPrompts) {
        actions.push({
            title: tr("Improve answer quality on unanswered prompts", "Perbaiki kualitas jawaban untuk prompt yang belum terjawab"),
            tag: tr("Quick win", "Cepat terlihat hasilnya"),
        });
    }

    if (actions.length === 0) {
        actions.push({
            title: tr("Maintain prompt monitoring cadence", "Pertahankan ritme pemantauan prompt"),
            tag: tr("Stable", "Stabil"),
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
                    engine,
                    citations,
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
                citations: [],
            });
        }

        const prompts = (latest.prompt_test_runs || []).map((row) => ({
            prompt: row.prompt,
            engine: row.engine || row.metadata?.engine || latest.engine || "gpt-4o-mini-simulated",
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
            citations: latest.result?.citations || [],
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

        // Group by engine, keep only the latest per engine (older runs map onto the engine they used)
        const latestByEngine = {};
        (allResults || []).forEach(result => {
            const engineKey = engineKeyFor(result.engine) || result.engine || "gpt-4o-mini-simulated";
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
            engineName: e.engine || "gpt-4o-mini-simulated",
            engineKey: engineKeyFor(e.engine),
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
            engine_breakdown: engineBreakdown,
            // The five assistants checked for GEO and whether each has an API key.
            engines: engineStatus(),
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
            const engName = r.engine || "gpt-4o-mini-simulated";
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
            engineName: engineName || "gpt-4o-mini-simulated",
        });

        res.status(201).json(result);
    } catch (error) {
        logStructured("error", "Error running visibility analysis:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/visibility/analyze-all — ask every connected AI assistant the workspace's test prompts.
router.post("/analyze-all", requireWorkspaceRole(MANAGER_ROLES), async (req, res) => {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.body?.workspaceId);
        if (!scopedWorkspaceId) return res.status(403).json({ error: "Workspace access denied" });

        const { data: settings } = await supabase.from("workspace_settings").select("brand_name").eq("workspace_id", scopedWorkspaceId).maybeSingle();
        const { data: keywords } = await supabase.from("monitoring_keywords").select("keyword").eq("workspace_id", scopedWorkspaceId).eq("is_active", true).limit(3);
        const brandName = String(req.body?.brandName || settings?.brand_name || keywords?.[0]?.keyword || "").trim();
        if (!brandName) return res.status(400).json({ error: tr("Set a brand name or an active keyword first.", "Isi nama brand atau kata kunci aktif dulu."), code: "NO_BRAND" });
        const competitors = Array.isArray(req.body?.competitors) ? req.body.competitors.slice(0, 3) : [];
        // Three prompts per engine keeps a full run around a minute and its cost small.
        const queries = generatePromptVariants(brandName, competitors).slice(0, 3).map((p) => p.prompt);

        const connected = GEO_ENGINES.filter(isEngineConfigured);
        if (connected.length === 0) return res.status(400).json({ error: tr("No AI assistant is connected yet.", "Belum ada asisten AI yang terhubung."), code: "NO_ENGINES" });

        const results = await Promise.all(connected.map(async (engine) => {
            try {
                const r = await runVisibilityAnalysis({ workspaceId: scopedWorkspaceId, brandName, competitors, queries, engineName: engine.key });
                return { engine: engine.key, ok: true, score: r?.score ?? null };
            } catch (error) {
                return { engine: engine.key, ok: false, error: String(error?.message || error).slice(0, 160) };
            }
        }));
        res.status(201).json({ brandName, prompts: queries.length, results, engines: engineStatus() });
    } catch (error) {
        logStructured("error", "Error running multi-engine visibility analysis:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
