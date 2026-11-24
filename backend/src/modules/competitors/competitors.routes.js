/**
 * Competitor comparison: how much online news coverage the brand gets next to up to three competitors.
 *
 * GET /workspace/competitors          { competitors, share: { days, at, rows: [{ name, isBrand, articles, share }] } }
 * PUT /workspace/competitors          { competitors: string[] } (owners and admins)
 *
 * Every name is counted the same way (Google News Indonesia, the name as an exact phrase, the last 7 days), so the
 * shares are comparable. Google News returns at most 100 items per query; a count of 100 means "100 or more".
 * Counts are kept for 6 hours in workspaces.settings.competitorShare. No AI is involved.
 */
import express from "express";
import { z } from "zod";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { resolveWorkspaceIdForUser, requireWorkspaceRole, MANAGER_ROLES } from "../../lib/workspace-access.js";
import { baseSupabaseAdmin as db } from "../../lib/supabase.js";
import { recordAuditLog } from "../../lib/audit.js";
import { logStructured } from "../../lib/logger.js";
import { phraseQuery } from "../../lib/keyword-match.js";
import { runAiTask } from "../../lib/ai-gateway.js";

const router = express.Router();
router.use(verifyToken);

export const MAX_COMPETITORS = 3;
const DAYS = 7;
const CACHE_MS = 6 * 60 * 60 * 1000;
export const GOOGLE_NEWS_CAP = 100;
const INDONESIA_EDITION = "hl=id&gl=ID&ceid=ID:id"; // same edition as monitoring (rss-ingestion GOOGLE_NEWS_EDITIONS.id)
const defaultFeed = async (url, options) => (await import("../ingestion/rss-ingestion.service.js")).fetchRssFeed(url, options);

/** Articles in the last `days` days that Google News Indonesia returns for the name as an exact phrase. */
export async function countNews(name, { days = DAYS, fetchFeed = defaultFeed, now = Date.now() } = {}) {
    const q = `${phraseQuery(name)} when:${days}d`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&${INDONESIA_EDITION}`;
    const items = await fetchFeed(url, { limit: GOOGLE_NEWS_CAP });
    const since = now - days * 86400000;
    return (items || []).filter((it) => !it.publishedAt || Date.parse(it.publishedAt) >= since).length;
}

/** The rows for the brand and its competitors, each with its share of their combined coverage. */
export function shareRows(counts) {
    const total = counts.reduce((n, c) => n + c.articles, 0);
    return counts.map((c) => ({ ...c, share: total ? Math.round((c.articles / total) * 100) : 0 }));
}

async function load(workspaceId) {
    const [{ data: ws }, { data: settings }, { data: kws }] = await Promise.all([
        db.from("workspaces").select("settings").eq("id", workspaceId).maybeSingle(),
        db.from("workspace_settings").select("brand_name").eq("workspace_id", workspaceId).maybeSingle(),
        db.from("monitoring_keywords").select("keyword").eq("workspace_id", workspaceId).eq("is_active", true).order("created_at", { ascending: true }).limit(1),
    ]);
    const s = ws?.settings || {};
    return { settings: s, competitors: Array.isArray(s.competitors) ? s.competitors : [], brand: settings?.brand_name || kws?.[0]?.keyword || null };
}

router.get("/", async (req, res) => {
    try {
        const ws = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId || null);
        if (!ws) return res.status(403).json({ error: "Workspace access denied", code: "WORKSPACE_ACCESS_DENIED" });
        const { settings, competitors, brand } = await load(ws);
        if (!competitors.length || !brand) return res.json({ brand, competitors, share: null, maxCompetitors: MAX_COMPETITORS });

        const key = [brand, ...competitors].join("|").toLowerCase();
        const cached = settings.competitorShare;
        if (cached && cached.key === key && Date.now() - Date.parse(cached.at) < CACHE_MS) {
            return res.json({ brand, competitors, share: cached, maxCompetitors: MAX_COMPETITORS });
        }
        const names = [{ name: brand, isBrand: true }, ...competitors.map((name) => ({ name, isBrand: false }))];
        const counts = await Promise.all(names.map(async (n) => ({ ...n, articles: await countNews(n.name).catch(() => 0) })));
        const share = { key, days: DAYS, cap: GOOGLE_NEWS_CAP, at: new Date().toISOString(), rows: shareRows(counts) };
        await db.from("workspaces").update({ settings: { ...settings, competitorShare: share } }).eq("id", ws);
        return res.json({ brand, competitors, share, maxCompetitors: MAX_COMPETITORS });
    } catch (error) {
        logStructured("error", "competitor_share_failed", { error: error?.message || error });
        return res.status(500).json({ error: "Could not load the comparison." });
    }
});

// Words that mark a headline as bad news for the company it names (Indonesian and English).
const NEGATIVE = /\b(gugat|digugat|kasus|korupsi|penipuan|tipu|bocor|kebocoran|rugi|merugi|anjlok|turun|protes|keluhan|komplain|viral|denda|sanksi|ojk|dicabut|pecat|phk|tunggak|macet|debt collector|tarik paksa|pailit|bangkrut|skandal|demo|mogok|ditangkap|tersangka|polisi|lapor|dilaporkan|hoaks|masalah|krisis|fraud|lawsuit|scandal|loss|fine|probe|breach)\b/i;
const INSIGHT_CACHE_MS = 6 * 60 * 60 * 1000;

/** The latest Google News Indonesia headlines naming `name`, newest first. */
async function headlines(name, { fetchFeed = defaultFeed } = {}) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${phraseQuery(name)} when:${DAYS}d`)}&${INDONESIA_EDITION}`;
    const items = await fetchFeed(url, { limit: GOOGLE_NEWS_CAP }).catch(() => []);
    // Google News also matches the name inside page text or as part of other words ("BAF" in a Vietnamese stock
    // story), so only headlines that carry the name itself count.
    const needle = String(name).toLowerCase();
    const named = (items || []).filter((it) => String(it.title || "").toLowerCase().includes(needle));
    const rows = named.map((it) => ({ title: it.title, url: it.url, publisher: it.publisher || null, at: it.publishedAt || null, negative: NEGATIVE.test(it.title || "") }))
        .sort((a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0));
    return { articles: rows.length, negative: rows.filter((r) => r.negative).length, items: rows.slice(0, 8) };
}

/**
 * GET /workspace/competitors/insight — side by side for the brand and each competitor: news volume and share, how
 * many headlines read as bad news, the latest headlines, how often AI assistants named each one (from the latest AI
 * visibility test), and a short AI read of where the brand stands. Cached 6 hours (?refresh=1 recounts).
 */
router.get("/insight", async (req, res) => {
    try {
        const ws = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId || null);
        if (!ws) return res.status(403).json({ error: "Workspace access denied", code: "WORKSPACE_ACCESS_DENIED" });
        const { settings, competitors, brand } = await load(ws);
        if (!brand) return res.json({ brand, competitors, insight: null, maxCompetitors: MAX_COMPETITORS });
        if (!competitors.length) return res.json({ brand, competitors, insight: null, maxCompetitors: MAX_COMPETITORS });
        const key = [brand, ...competitors].join("|").toLowerCase();
        const cached = settings.competitorInsight;
        if (req.query.refresh !== "1" && cached && cached.key === key && Date.now() - Date.parse(cached.at) < INSIGHT_CACHE_MS) {
            return res.json({ brand, competitors, insight: cached, maxCompetitors: MAX_COMPETITORS });
        }

        const names = [{ name: brand, isBrand: true }, ...competitors.map((name) => ({ name, isBrand: false }))];
        const news = await Promise.all(names.map((n) => headlines(n.name)));

        // AI answers: how many of the latest test answers named each one.
        const { data: latest } = await db.from("ai_visibility_results").select("id, engine, created_at").eq("workspace_id", ws).order("created_at", { ascending: false }).limit(20);
        const seen = new Set();
        const latestIds = (latest || []).filter((r) => !seen.has(r.engine) && seen.add(r.engine)).map((r) => r.id);
        const { data: runs } = latestIds.length ? await db.from("prompt_test_runs").select("metadata, sentiment").in("visibility_result_id", latestIds).limit(200) : { data: [] };
        const answers = (runs || []).length;
        const aiNamed = (n) => (runs || []).filter((r) => n.isBrand
            ? String(r.metadata?.brand || (r.sentiment === "positive" ? "mentioned" : "")).toLowerCase() === "mentioned"
            : String(r.metadata?.competitor || "").toLowerCase().includes(n.name.toLowerCase())).length;

        const total = news.reduce((t, n) => t + n.articles, 0);
        const rows = names.map((n, i) => ({
            ...n,
            articles: news[i].articles,
            share: total ? Math.round((news[i].articles / total) * 100) : 0,
            negative: news[i].negative,
            negativeShare: news[i].articles ? Math.round((news[i].negative / news[i].articles) * 100) : 0,
            aiNamed: aiNamed(n),
            headlines: news[i].items,
        }));

        // A short read for the team. Skipped (not an error) when the AI budget is used up.
        let read = null;
        const lang = req.get("accept-language")?.startsWith("en") ? "en" : "id";
        const brief = rows.map((r) => `${r.name}${r.isBrand ? " (OUR BRAND)" : ""}: ${r.articles} articles in ${DAYS} days, ${r.negative} bad-news headlines, named in ${r.aiNamed}/${answers} AI answers. Headlines: ${r.headlines.slice(0, 5).map((h) => h.title).join(" | ")}`).join("\n");
        const out = await runAiTask({
            task: "summarization",
            workspaceId: ws,
            json: true,
            system: "You compare a brand with its competitors for a PR team. Use only the data given. Be concrete and short.",
            user: `${brief}\n\nReturn JSON {"summary": string (2 sentences, where the brand stands), "opportunities": string[] (up to 3: things a competitor is struggling with or a gap the brand can use, each one sentence), "watch": string[] (up to 2: where a competitor is ahead)}. Write in ${lang === "en" ? "English" : "Bahasa Indonesia"}.`,
            validate: (d) => typeof d?.summary === "string",
        }).catch(() => null);
        if (out && !out.ok) logStructured("warn", "competitor_read_failed", { error: out.error, detail: out.detail || out.raw || null });
        if (out?.ok) read = { summary: out.data.summary, opportunities: (out.data.opportunities || []).slice(0, 3), watch: (out.data.watch || []).slice(0, 2) };

        const insight = { key, days: DAYS, cap: GOOGLE_NEWS_CAP, at: new Date().toISOString(), aiAnswers: answers, rows, read };
        await db.from("workspaces").update({ settings: { ...settings, competitorInsight: insight } }).eq("id", ws);
        return res.json({ brand, competitors, insight, maxCompetitors: MAX_COMPETITORS });
    } catch (error) {
        logStructured("error", "competitor_insight_failed", { error: error?.message || error });
        return res.status(500).json({ error: "Could not load the competitor check." });
    }
});

const putBody = z.object({ competitors: z.array(z.string().trim().min(2).max(60)).max(MAX_COMPETITORS) });

router.put("/", validateRequest({ body: putBody }), requireWorkspaceRole(MANAGER_ROLES), async (req, res) => {
    try {
        const ws = req.scopedWorkspaceId;
        const { settings } = await load(ws);
        const seen = new Set();
        const competitors = req.body.competitors.map((c) => c.replace(/\s+/g, " ")).filter((c) => !seen.has(c.toLowerCase()) && seen.add(c.toLowerCase()));
        const next = { ...settings, competitors };
        delete next.competitorShare; // recount with the new list
        delete next.competitorInsight;
        const { error } = await db.from("workspaces").update({ settings: next }).eq("id", ws);
        if (error) throw error;
        await recordAuditLog({ userId: req.user.id, workspaceId: ws, event: "competitors_updated", metadata: { competitors } });
        return res.json({ competitors });
    } catch (error) {
        logStructured("error", "competitors_update_failed", { error: error?.message || error });
        return res.status(500).json({ error: "Could not save competitors." });
    }
});

export default router;
