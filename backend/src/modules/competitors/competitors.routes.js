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

const putBody = z.object({ competitors: z.array(z.string().trim().min(2).max(60)).max(MAX_COMPETITORS) });

router.put("/", validateRequest({ body: putBody }), requireWorkspaceRole(MANAGER_ROLES), async (req, res) => {
    try {
        const ws = req.scopedWorkspaceId;
        const { settings } = await load(ws);
        const seen = new Set();
        const competitors = req.body.competitors.map((c) => c.replace(/\s+/g, " ")).filter((c) => !seen.has(c.toLowerCase()) && seen.add(c.toLowerCase()));
        const next = { ...settings, competitors };
        delete next.competitorShare; // recount with the new list
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
