/**
 * The press release step of an action plan.
 *
 *   draft (AI or a person) → awaiting approval → approved, or revision requested → a new version → awaiting approval …
 *   Only an approved release can go to media: the client picks outlets, then asks Narriv for a quote.
 *
 * GET  /press/media                   the outlet list (tier, niche, area; no prices)
 * GET  /press/:planId                 the release, its history, the picked outlets and outlet recommendations
 * POST /press/:planId/draft           AI writes the first draft (members who can edit)
 * PUT  /press/:planId                 a person edits the text; it goes back to awaiting approval
 * POST /press/:planId/review          owner/admin: { decision: "approve" } or { decision: "revise", note } (AI rewrites with the note)
 * PUT  /press/:planId/media           pick outlets (approved releases only)
 * POST /press/:planId/quote           owner/admin: ask Narriv for the price of the picked outlets
 *
 * Stored inside action_plans.strategy (a JSON text) under press_release, so no schema change is needed.
 */
import express from "express";
import { z } from "zod";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { baseSupabaseAdmin as db } from "../../lib/supabase.js";
import { runAiTask } from "../../lib/ai-gateway.js";
import { requestLang } from "../../lib/request-context.js";
import { recordAuditLog } from "../../lib/audit.js";
import { logStructured } from "../../lib/logger.js";
import { MEDIA_OUTLETS, MEDIA_BY_ID, outletOfSignal } from "./media-outlets.js";
import { deliveryView, impactView, mountFulfilmentRoutes } from "./fulfilment.js";
import { canApprove, canEdit, docView, fail, guard, loadPlan, mountApprovalRoutes, notifyTeam, requester, saveDoc } from "./approval-doc.js";

const router = express.Router();
router.use(verifyToken);

const MAX_OUTLETS = 60;
const KEY = "press_release";
const saveRelease = (ctx, release) => saveDoc(ctx, KEY, release);
/** What the reader sees: the release plus the outlets picked for it. */
const view = (release) => (release ? { ...docView(release), picked: (release.media || []).map((id) => MEDIA_BY_ID.get(id)).filter(Boolean) } : null);

async function planContext(ctx) {
    const { plan, strategy } = ctx;
    const [{ data: settings }, { data: cluster }] = await Promise.all([
        db.from("workspace_settings").select("brand_name, industry").eq("workspace_id", plan.workspace_id).maybeSingle(),
        plan.cluster_id ? db.from("narrative_clusters").select("title, summary").eq("id", plan.cluster_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const { data: ws } = await db.from("workspaces").select("name").eq("id", plan.workspace_id).maybeSingle();
    const option = strategy?.balanced || strategy || {};
    const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
    return {
        brand: settings?.brand_name || ws?.name || "the company",
        industry: settings?.industry || null,
        issue: cluster ? `${cluster.title}. ${cluster.summary || ""}` : plan.description || "",
        plan: plan.title,
        summary: option.executive_summary || strategy?.executive_summary || "",
        messages: [...list(option.key_messages), ...list(option.talking_points)].slice(0, 6),
        draft: option.draft || option.holding_statement || "",
    };
}

async function writeRelease(ctx, { note = null, current = null } = {}) {
    const c = await planContext(ctx);
    const id = requestLang() === "id";
    const today = new Date().toLocaleDateString(id ? "id-ID" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
    const system = [
        `You write press releases for ${c.brand}${c.industry ? ` (${c.industry})` : ""} in ${id ? "Indonesian (Bahasa Indonesia baku, the register Indonesian newsrooms use)" : "English"}.`,
        "A real release an editor can publish as is: a factual headline without hype, a dateline lead that answers who, what, when and why,",
        "two to four short paragraphs, one quote from a spokesperson (write [Nama Juru Bicara], [Jabatan] where the name is unknown),",
        `and a closing "${id ? "Tentang" : "About"} ${c.brand}" paragraph. Do not invent figures, dates, names, or commitments (actions the company will take) that are not in the context: a promise in a release binds the company.`,
        "Never repeat the accusation or the negative claim in the headline; address it in the body with facts.",
        'Reply as JSON: {"title": string, "body": string}. Separate paragraphs in body with a blank line.',
    ].join(" ");
    const user = [
        `Date: ${today}. Dateline city: Jakarta.`,
        `Issue: ${c.issue}`,
        `Response plan: ${c.plan}. ${c.summary}`,
        c.messages.length ? `Key messages:\n- ${c.messages.join("\n- ")}` : "",
        c.draft ? `Draft statement from the plan: ${c.draft}` : "",
        current ? `Current version to revise:\nTitle: ${current.title}\n\n${current.body}` : "",
        note ? `Reviewer's revision request (follow it exactly): ${note}` : "",
    ].filter(Boolean).join("\n\n");
    const result = await runAiTask({
        task: "generation",
        workspaceId: ctx.plan.workspace_id,
        json: true,
        system,
        user,
        validate: (v) => v && typeof v.title === "string" && v.title.trim().length > 5 && typeof v.body === "string" && v.body.trim().length > 200,
    });
    if (!result?.ok) throw Object.assign(new Error("The press release could not be written. Try again."), { status: 502 });
    return { title: result.data.title.trim().slice(0, 200), body: result.data.body.trim().slice(0, 8000) };
}

/**
 * Outlets that already cover the issue (from the issue's records) and the brand (last 30 days). News arrives through
 * Google News links, so the outlet is read from the publisher's name, then from the link's host for direct links.
 */
async function recommendations(ctx) {
    const count = (rows) => rows.reduce((m, r) => {
        const id = outletOfSignal(r);
        return id ? m.set(id, (m.get(id) || 0) + 1) : m;
    }, new Map());
    let issueRows = [];
    if (ctx.plan.cluster_id) {
        const { data: links } = await db.from("narrative_cluster_signals").select("signal_id").eq("cluster_id", ctx.plan.cluster_id).limit(300);
        const ids = (links || []).map((l) => l.signal_id);
        if (ids.length) issueRows = (await db.from("signals").select("url, metadata").in("id", ids)).data || [];
    }
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: brandRows } = await db.from("signals").select("url, metadata").eq("workspace_id", ctx.plan.workspace_id).gte("captured_at", since).limit(3000);
    const issue = count(issueRows);
    const brand = count(brandRows || []);
    const out = {};
    for (const id of new Set([...issue.keys(), ...brand.keys()])) out[id] = { issue: issue.get(id) || 0, brand: brand.get(id) || 0 };
    return out;
}

/** Owned outlets whose area the issue (or, without an issue, the brand's recent news) talks about. */
async function ownedFit(ctx) {
    let rows = [];
    if (ctx.plan.cluster_id) {
        const { data: links } = await db.from("narrative_cluster_signals").select("signal_id").eq("cluster_id", ctx.plan.cluster_id).limit(300);
        const ids = (links || []).map((l) => l.signal_id);
        if (ids.length) rows = (await db.from("signals").select("title, content").in("id", ids)).data || [];
    } else {
        rows = (await db.from("signals").select("title, content").eq("workspace_id", ctx.plan.workspace_id).gte("captured_at", new Date(Date.now() - 30 * 86400000).toISOString()).limit(1000)).data || [];
    }
    const text = rows.map((r) => `${r.title || ""} ${String(r.content || "").slice(0, 600)}`).join(" ").toLowerCase();
    return MEDIA_OUTLETS.filter((o) => o.owned && o.localTerms.some((t) => text.includes(t))).map((o) => o.id);
}

router.get("/media", (_req, res) => res.json({ data: MEDIA_OUTLETS.map(({ localTerms: _t, ...o }) => o) }));

router.get("/:planId", async (req, res) => {
    try {
        const ctx = await loadPlan(req);
        if (!ctx) return res.status(404).json({ error: "Action plan not found" });
        const doc = ctx.strategy?.press_release || null;
        return res.json({
            data: view(doc),
            canEdit: canEdit(ctx.role),
            canApprove: canApprove(ctx.role),
            recommended: await recommendations(ctx).catch(() => ({})),
            ownedFit: await ownedFit(ctx).catch(() => []),
            delivery: await deliveryView("press", ctx.plan.workspace_id, doc).catch(() => null),
            impact: await impactView(ctx.plan.workspace_id, ctx.plan, doc).catch(() => null),
        });
    } catch (error) {
        logStructured("error", "press_release_read_failed", { error: error?.message || error });
        return res.status(500).json({ error: "The press release could not be loaded." });
    }
});

mountApprovalRoutes(router, { key: KEY, event: "press_release", write: (ctx, opts) => writeRelease(ctx, opts), view });
mountFulfilmentRoutes(router, { kind: "press", view });

const mediaBody = z.object({ outletIds: z.array(z.string().max(80)).max(MAX_OUTLETS) });

router.put("/:planId/media", validateRequest({ body: mediaBody }), async (req, res) => {
    try {
        const ctx = await guard(req, res, "edit");
        if (!ctx) return;
        const current = ctx.strategy.press_release;
        if (current?.status !== "approved") return res.status(409).json({ error: "Approve the press release before choosing media." });
        if (current.quote && current.quote.status !== "declined") return res.status(409).json({ error: "A quote was requested for this selection." });
        const media = [...new Set(req.body.outletIds)].filter((id) => MEDIA_BY_ID.has(id));
        const release = await saveRelease(ctx, { ...current, media });
        return res.json({ data: view(release) });
    } catch (error) {
        return fail(res, error, "press_release_media_failed");
    }
});

const quoteBody = z.object({ note: z.string().trim().max(1000).optional().default("") });

router.post("/:planId/quote", validateRequest({ body: quoteBody }), async (req, res) => {
    try {
        const ctx = await guard(req, res, "approve");
        if (!ctx) return;
        const current = ctx.strategy.press_release;
        if (current?.status !== "approved") return res.status(409).json({ error: "Approve the press release before asking for a quote." });
        if (current.quote && current.quote.status !== "declined") return res.status(409).json({ error: "A quote was already requested." });
        const outlets = (current.media || []).map((id) => MEDIA_BY_ID.get(id)).filter(Boolean);
        if (!outlets.length) return res.status(400).json({ error: "Choose at least one outlet." });
        const who = await requester(ctx, req);
        const at = new Date().toISOString();
        const tiers = [1, 2, 3, 4].map((t) => outlets.filter((o) => o.tier === t).length);
        const text = [
            `Permintaan penawaran siaran pers (Narriv)`,
            `Workspace: ${who.workspace}`,
            `Diminta oleh: ${who.name}${who.email ? ` (${who.email})` : ""}`,
            `Rencana aksi: ${ctx.plan.title}`,
            `Judul rilis: ${current.title}`,
            `${outlets.length} media: Tier 1 ${tiers[0]} · Tier 2 ${tiers[1]} · Tier 3 ${tiers[2]} · Tier 4 ${tiers[3]}`,
            outlets.map((o) => `- ${o.name} (T${o.tier})`).join("\n"),
            req.body.note ? `Catatan: ${req.body.note}` : "",
        ].filter(Boolean).join("\n");

        const sent = await notifyTeam({ subject: `Permintaan penawaran rilis: ${who.workspace} · ${outlets.length} media`, text, metadata: { planId: ctx.plan.id } });
        if (!sent) return res.status(503).json({ error: "The request could not be sent. Try again in a moment." });
        const release = await saveRelease(ctx, { ...current, quote: { status: "requested", requestedAt: at, by: req.user.id, byName: who.name, outlets: outlets.length, note: req.body.note || null } });
        await recordAuditLog({ userId: req.user.id, workspaceId: ctx.plan.workspace_id, event: "press_release_quote_requested", metadata: { planId: ctx.plan.id, outlets: outlets.length } }).catch(() => null);
        return res.json({ data: view(release) });
    } catch (error) {
        return fail(res, error, "press_release_quote_failed");
    }
});

export default router;
