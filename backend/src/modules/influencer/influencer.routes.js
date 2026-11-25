/**
 * The influencer stage of an action plan, like the press release stage:
 *   brief (AI or a person) → owner/admin approves or asks for a revision → schedule in waves → pick creators, each with
 *   a wave, a posting date and a format → ask Narriv for a quote.
 *
 * The full database is open only to workspaces the Narriv team opened (workspaces.settings.creatorAccess); others see
 * a sample and can request access.
 *
 * GET  /influencer/creators            filtered, paged creators (+ facets) for the selected workspace
 * POST /influencer/access-request      ask the Narriv team to open the database for this workspace
 * GET  /influencer/:planId             the campaign: brief, schedule, picked creators, permissions
 * POST /influencer/:planId/draft | PUT /influencer/:planId | POST /influencer/:planId/review   (the brief, approval-doc.js)
 * PUT  /influencer/:planId/schedule    { start, end, waves[] }   (approved brief only)
 * PUT  /influencer/:planId/creators    { items: [{ id, wave, date, format }] }
 * POST /influencer/:planId/quote       owner/admin
 */
import express from "express";
import crypto from "crypto";
import { z } from "zod";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { baseSupabaseAdmin as db } from "../../lib/supabase.js";
import { resolveWorkspaceIdForUser, getWorkspaceRole, MANAGER_ROLES } from "../../lib/workspace-access.js";
import { runAiTask } from "../../lib/ai-gateway.js";
import { isPlatformAdmin } from "../../lib/platform-admin.js";
import { requestLang } from "../../lib/request-context.js";
import { recordAuditLog } from "../../lib/audit.js";
import { logStructured } from "../../lib/logger.js";
import { canApprove, canEdit, docView, fail, guard, isDemo, loadPlan, mountApprovalRoutes, notifyTeam, requester, saveDoc } from "../press/approval-doc.js";
import { deliveryView, impactView, mountFulfilmentRoutes } from "../press/fulfilment.js";
import { PLATFORMS, TIERS, categoriesForIndustry, creatorById, loadCreators } from "./creators.js";

const router = express.Router();
router.use(verifyToken);

const KEY = "influencer_campaign";
const MAX_CREATORS = 150;
const SAMPLE = 8;
export const FORMATS = ["reels", "feed", "story", "tiktok", "youtube", "live"];

/** The full database: workspaces the team opened, and always the Narriv team itself (platform admins). */
async function workspaceAccess(workspaceId, userId = null) {
    if (userId && await isPlatformAdmin(userId)) return true;
    const { data } = await db.from("workspaces").select("settings").eq("id", workspaceId).maybeSingle();
    return data?.settings?.creatorAccess === true;
}

const norm = (v) => String(v || "").toLowerCase().replace(/^@/, "").replace(/[^a-z0-9._]/g, "");

/** Why a creator fits this workspace: they already post about the brand (seen in its data), or their category fits. */
async function fitFor(workspaceId) {
    const [{ data: settings }, { data: rows }] = await Promise.all([
        db.from("workspace_settings").select("industry").eq("workspace_id", workspaceId).maybeSingle(),
        db.from("signals").select("author, metadata").eq("workspace_id", workspaceId).in("platform", ["instagram", "tiktok", "youtube"])
            .gte("captured_at", new Date(Date.now() - 90 * 86400000).toISOString()).limit(5000),
    ]);
    const mentions = new Map();
    for (const r of rows || []) {
        for (const k of new Set([norm(r.author), norm(r.metadata?.username), norm(r.metadata?.handle)])) if (k.length >= 3) mentions.set(k, (mentions.get(k) || 0) + 1);
    }
    return { categories: categoriesForIndustry(settings?.industry), mentions };
}

const publicCreator = (c, fit) => {
    const mentioned = fit?.mentions?.get(norm(c.handle)) || 0;
    return {
        id: c.id, name: c.name, handle: c.handle, platform: c.platform, link: c.link, category: c.industry, city: c.city,
        tier: c.tier, followers: c.followers ?? null, er: c.er ?? null, campaigns: c.campaigns ?? 0,
        fit: mentioned ? { mentioned } : fit?.categories?.includes(c.industry) ? { category: true } : null,
    };
};

const listQuery = z.object({
    q: z.string().trim().max(80).optional(),
    platform: z.enum(PLATFORMS).optional(),
    category: z.string().trim().max(60).optional(),
    city: z.string().trim().max(60).optional(),
    tier: z.enum(TIERS).optional(),
    minFollowers: z.coerce.number().int().min(0).optional(),
    maxFollowers: z.coerce.number().int().min(0).optional(),
    minEr: z.coerce.number().min(0).max(100).optional(),
    rec: z.enum(["1", "0"]).optional(),
    ids: z.string().max(4000).optional(),
    page: z.coerce.number().int().min(1).max(1000).optional().default(1),
    limit: z.coerce.number().int().min(10).max(60).optional().default(40),
});

router.get("/creators", validateRequest({ query: listQuery }), async (req, res) => {
    try {
        const workspaceId = await resolveWorkspaceIdForUser(req.user.id);
        if (!workspaceId) return res.status(403).json({ error: "Workspace access denied" });
        const all = loadCreators();
        const access = !isDemo(req) && await workspaceAccess(workspaceId, req.user.id);
        const fit = await fitFor(workspaceId);
        const q = req.query;
        const facet = (key) => Object.entries(all.reduce((m, c) => (c[key] ? { ...m, [c[key]]: (m[c[key]] || 0) + 1 } : m), {})).sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
        const facets = { platforms: facet("platform"), categories: facet("industry"), cities: facet("city").slice(0, 60), tiers: facet("tier"), withCity: all.filter((c) => c.city).length };
        if (!access) {
            // A sample of the database: enough to see what is in it, not enough to use it.
            const sample = all.filter((c) => c.followers && c.city && c.tier !== "Unknown").slice(0, SAMPLE).map((c) => publicCreator(c, fit));
            return res.json({ access: false, total: all.length, data: sample, facets, page: 1, pages: 1 });
        }
        if (q.ids) {
            const ids = new Set(q.ids.split(",").slice(0, MAX_CREATORS));
            return res.json({ access: true, total: ids.size, data: all.filter((c) => ids.has(c.id)).map((c) => publicCreator(c, fit)), facets, page: 1, pages: 1 });
        }
        const needle = q.q ? q.q.toLowerCase().replace(/^@/, "") : "";
        let rows = all.filter((c) =>
            (!q.platform || c.platform === q.platform)
            && (!q.category || c.industry === q.category)
            && (!q.city || (q.city === "__none" ? !c.city : c.city === q.city))
            && (!q.tier || c.tier === q.tier)
            && (q.minFollowers == null || (c.followers || 0) >= q.minFollowers)
            && (q.maxFollowers == null || (c.followers != null && c.followers <= q.maxFollowers))
            && (q.minEr == null || (c.er || 0) >= q.minEr)
            && (!needle || `${c.name} ${c.handle}`.toLowerCase().includes(needle)));
        const score = (c) => {
            const m = fit.mentions.get(norm(c.handle)) || 0;
            // Fit first; then engagement, track record and reach, so a big account with no engagement does not top the list.
            return (m ? 1e9 + m : 0) + (fit.categories.includes(c.industry) ? 1e8 : 0) + Math.min(c.er || 0, 15) * 1e4 + (c.campaigns || 0) * 2e3 + Math.log10((c.followers || 0) + 1) * 1e3;
        };
        if (q.rec === "1") rows = rows.filter((c) => fit.mentions.get(norm(c.handle)) || fit.categories.includes(c.industry));
        rows = rows.slice().sort((a, b) => score(b) - score(a));
        const pages = Math.max(1, Math.ceil(rows.length / q.limit));
        const page = Math.min(q.page, pages);
        return res.json({ access: true, total: rows.length, data: rows.slice((page - 1) * q.limit, page * q.limit).map((c) => publicCreator(c, fit)), facets, page, pages });
    } catch (error) {
        logStructured("error", "creators_list_failed", { error: error?.message || error });
        return res.status(500).json({ error: "The influencer list could not be loaded." });
    }
});

router.post("/access-request", async (req, res) => {
    try {
        if (isDemo(req)) return res.status(403).json({ error: "The demo is read-only." });
        const workspaceId = await resolveWorkspaceIdForUser(req.user.id);
        if (!workspaceId) return res.status(403).json({ error: "Workspace access denied" });
        const role = await getWorkspaceRole(req.user.id, workspaceId);
        if (!MANAGER_ROLES.includes(role)) return res.status(403).json({ error: "Only an owner or admin can request access." });
        const who = await requester({ workspaceId }, req);
        const sent = await notifyTeam({
            subject: `Permintaan akses database influencer: ${who.workspace}`,
            text: [`Permintaan akses database influencer (Narriv)`, `Workspace: ${who.workspace}`, `Diminta oleh: ${who.name}${who.email ? ` (${who.email})` : ""}`, `Buka di panel admin Narriv: Database influencer.`].join("\n"),
            metadata: { workspaceId },
        });
        if (!sent) return res.status(503).json({ error: "The request could not be sent. Try again in a moment." });
        await recordAuditLog({ userId: req.user.id, workspaceId, event: "creator_access_requested" }).catch(() => null);
        return res.json({ ok: true });
    } catch (error) {
        return fail(res, error, "creator_access_request_failed");
    }
});

/** What the reader sees: the brief, the schedule and the picked creators with their public details. */
function view(doc) {
    if (!doc) return null;
    const items = (doc.creators || []).map((it) => {
        const c = creatorById(it.id);
        return c ? { ...it, creator: publicCreator(c) } : null;
    }).filter(Boolean);
    return { ...docView(doc), schedule: doc.schedule || null, creators: items };
}

async function writeBrief(ctx, { note = null, current = null } = {}) {
    const { plan, strategy } = ctx;
    const [{ data: settings }, { data: cluster }, { data: ws }] = await Promise.all([
        db.from("workspace_settings").select("brand_name, industry").eq("workspace_id", plan.workspace_id).maybeSingle(),
        plan.cluster_id ? db.from("narrative_clusters").select("title, summary").eq("id", plan.cluster_id).maybeSingle() : Promise.resolve({ data: null }),
        db.from("workspaces").select("name").eq("id", plan.workspace_id).maybeSingle(),
    ]);
    const brand = settings?.brand_name || ws?.name || "the brand";
    const option = strategy?.balanced || strategy || {};
    const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
    const id = requestLang() === "id";
    const H = id
        ? ["Tujuan", "Pesan kunci", "Yang wajib", "Yang tidak boleh", "Format dan platform", "Hashtag dan ajakan"]
        : ["Objective", "Key messages", "Must do", "Must not", "Format and platform", "Hashtags and call to action"];
    const system = [
        `You write influencer campaign briefs for ${brand}${settings?.industry ? ` (${settings.industry})` : ""} in ${id ? "Indonesian" : "English"}, for creators to follow.`,
        `Use exactly these section headings, each on its own line followed by short lines starting with "- ": ${H.join(", ")}.`,
        "Plain and concrete. The content must feel like the creator's own voice, never a read-out statement.",
        "In a sensitive issue, creators do not defend the company, attack critics or discuss the allegation; they show the facts and the help available.",
        "Always require the paid-partnership label (#ad or the platform's paid partnership tag).",
        "Do not invent figures, promotions, prizes or commitments that are not in the context.",
        'Reply as JSON: {"title": string, "body": string}.',
    ].join(" ");
    const user = [
        cluster ? `Issue: ${cluster.title}. ${cluster.summary || ""}` : plan.description ? `Context: ${plan.description}` : "",
        `Response plan: ${plan.title}. ${option.executive_summary || strategy?.executive_summary || ""}`,
        list(option.key_messages).length ? `Key messages:\n- ${list(option.key_messages).slice(0, 6).join("\n- ")}` : "",
        current ? `Current brief to revise:\nTitle: ${current.title}\n\n${current.body}` : "",
        note ? `Reviewer's revision request (follow it exactly): ${note}` : "",
    ].filter(Boolean).join("\n\n");
    const result = await runAiTask({
        task: "generation", workspaceId: plan.workspace_id, json: true, system, user,
        validate: (v) => v && typeof v.title === "string" && v.title.trim().length > 5 && typeof v.body === "string" && v.body.trim().length > 200,
    });
    if (!result?.ok) throw Object.assign(new Error("The brief could not be written. Try again."), { status: 502 });
    return { title: result.data.title.trim().slice(0, 200), body: result.data.body.trim().slice(0, 8000) };
}

router.get("/:planId", async (req, res) => {
    try {
        const ctx = await loadPlan(req);
        if (!ctx) return res.status(404).json({ error: "Action plan not found" });
        const doc = ctx.strategy?.[KEY] || null;
        return res.json({
            delivery: await deliveryView("influencer", ctx.plan.workspace_id, doc).catch(() => null),
            impact: await impactView(ctx.plan.workspace_id, ctx.plan, doc).catch(() => null),
            data: view(doc),
            canEdit: canEdit(ctx.role),
            canApprove: canApprove(ctx.role),
            access: !isDemo(req) && await workspaceAccess(ctx.plan.workspace_id, req.user.id),
            formats: FORMATS,
        });
    } catch (error) {
        logStructured("error", "influencer_campaign_read_failed", { error: error?.message || error });
        return res.status(500).json({ error: "The influencer campaign could not be loaded." });
    }
});

mountApprovalRoutes(router, { key: KEY, event: "influencer_brief", write: (ctx, opts) => writeBrief(ctx, opts), view });
mountFulfilmentRoutes(router, { kind: "influencer", view });

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date.");
const scheduleBody = z.object({
    start: day,
    end: day,
    waves: z.array(z.object({ id: z.string().max(40).optional(), name: z.string().trim().min(1).max(60), start: day, end: day })).min(1).max(8),
}).refine((s) => s.start <= s.end, { message: "The campaign ends before it starts." })
    .refine((s) => s.waves.every((w) => w.start <= w.end && w.start >= s.start && w.end <= s.end), { message: "Every wave must sit inside the campaign dates." });

router.put("/:planId/schedule", validateRequest({ body: scheduleBody }), async (req, res) => {
    try {
        const ctx = await guard(req, res, "edit");
        if (!ctx) return;
        const current = ctx.strategy[KEY];
        if (current?.status !== "approved") return res.status(409).json({ error: "Approve the brief before planning the schedule." });
        if (current.quote && current.quote.status !== "declined") return res.status(409).json({ error: "A quote was requested for this plan." });
        const waves = req.body.waves.map((w) => ({ ...w, id: w.id || crypto.randomUUID().slice(0, 8) }));
        const ids = new Set(waves.map((w) => w.id));
        // Creators keep their wave when it still exists, and their date when it still fits it.
        const creators = (current.creators || []).map((it) => {
            const w = waves.find((x) => x.id === it.wave) || waves[0];
            const date = it.date && it.date >= w.start && it.date <= w.end ? it.date : w.start;
            return { ...it, wave: ids.has(it.wave) ? it.wave : w.id, date };
        });
        const doc = await saveDoc(ctx, KEY, { ...current, schedule: { start: req.body.start, end: req.body.end, waves }, creators });
        return res.json({ data: view(doc) });
    } catch (error) {
        return fail(res, error, "influencer_schedule_failed");
    }
});

const creatorsBody = z.object({
    items: z.array(z.object({ id: z.string().max(20), wave: z.string().max(40), date: day, format: z.enum(FORMATS) })).max(MAX_CREATORS),
});

router.put("/:planId/creators", validateRequest({ body: creatorsBody }), async (req, res) => {
    try {
        const ctx = await guard(req, res, "edit");
        if (!ctx) return;
        const current = ctx.strategy[KEY];
        if (current?.status !== "approved" || !current.schedule) return res.status(409).json({ error: "Approve the brief and set the schedule first." });
        if (current.quote && current.quote.status !== "declined") return res.status(409).json({ error: "A quote was requested for this plan." });
        if (!await workspaceAccess(ctx.plan.workspace_id, req.user.id)) return res.status(403).json({ error: "The influencer database is not open for this workspace.", code: "CREATOR_ACCESS" });
        const waves = new Map(current.schedule.waves.map((w) => [w.id, w]));
        const seen = new Set();
        const items = [];
        for (const it of req.body.items) {
            const w = waves.get(it.wave);
            if (!w || seen.has(it.id) || !creatorById(it.id)) continue;
            if (it.date < w.start || it.date > w.end) return res.status(400).json({ error: "A posting date is outside its wave." });
            seen.add(it.id);
            items.push(it);
        }
        const doc = await saveDoc(ctx, KEY, { ...current, creators: items });
        return res.json({ data: view(doc) });
    } catch (error) {
        return fail(res, error, "influencer_creators_failed");
    }
});

const quoteBody = z.object({ note: z.string().trim().max(1000).optional().default("") });

router.post("/:planId/quote", validateRequest({ body: quoteBody }), async (req, res) => {
    try {
        const ctx = await guard(req, res, "approve");
        if (!ctx) return;
        const current = ctx.strategy[KEY];
        if (current?.status !== "approved" || !current.schedule) return res.status(409).json({ error: "Approve the brief and set the schedule first." });
        if (current.quote && current.quote.status !== "declined") return res.status(409).json({ error: "A quote was already requested." });
        const v = view(current);
        if (!v.creators.length) return res.status(400).json({ error: "Choose at least one influencer." });
        const who = await requester(ctx, req);
        const fmtDate = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
        const reach = v.creators.reduce((s, it) => s + (it.creator.followers || 0), 0);
        const lines = current.schedule.waves.map((w) => {
            const inWave = v.creators.filter((it) => it.wave === w.id).sort((a, b) => a.date.localeCompare(b.date));
            return [`${w.name} (${fmtDate(w.start)}–${fmtDate(w.end)}): ${inWave.length} influencer`, ...inWave.map((it) => `- ${fmtDate(it.date)} · @${it.creator.handle} (${it.creator.platform}, ${it.creator.tier}${it.creator.city ? `, ${it.creator.city}` : ""}) · ${it.format}`)].join("\n");
        });
        const text = [
            `Permintaan penawaran kampanye influencer (Narriv)`,
            `Workspace: ${who.workspace}`,
            `Diminta oleh: ${who.name}${who.email ? ` (${who.email})` : ""}`,
            `Rencana aksi: ${ctx.plan.title}`,
            `Brief: ${current.title}`,
            `Periode: ${fmtDate(current.schedule.start)}–${fmtDate(current.schedule.end)} · ${v.creators.length} influencer · total followers ${reach.toLocaleString("id-ID")}`,
            ...lines,
            req.body.note ? `Catatan: ${req.body.note}` : "",
        ].filter(Boolean).join("\n");
        const sent = await notifyTeam({ subject: `Permintaan penawaran influencer: ${who.workspace} · ${v.creators.length} influencer`, text, metadata: { planId: ctx.plan.id } });
        if (!sent) return res.status(503).json({ error: "The request could not be sent. Try again in a moment." });
        const doc = await saveDoc(ctx, KEY, { ...current, quote: { status: "requested", requestedAt: new Date().toISOString(), by: req.user.id, byName: who.name, creators: v.creators.length, note: req.body.note || null } });
        await recordAuditLog({ userId: req.user.id, workspaceId: ctx.plan.workspace_id, event: "influencer_quote_requested", metadata: { planId: ctx.plan.id, creators: v.creators.length } }).catch(() => null);
        return res.json({ data: view(doc) });
    } catch (error) {
        return fail(res, error, "influencer_quote_failed");
    }
});

export default router;
