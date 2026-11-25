/**
 * After a quote request: the Narriv team answers with a price (admin panel), the client accepts or declines it, an
 * invoice is issued, every outlet or creator is tracked until it is published (found automatically in the collected
 * data, or marked by hand), and the impact on the issue is measured before and after.
 *
 * Lives in the same strategy document as the press release / influencer campaign (doc.quote, doc.delivery).
 *   quote.status: requested → quoted → accepted | declined
 */
import { z } from "zod";
import { validateRequest } from "../../middlewares/validate-request.js";
import { baseSupabaseAdmin as db } from "../../lib/supabase.js";
import { recordAuditLog } from "../../lib/audit.js";
import { sendEmail, isEmailConfigured } from "../../lib/email.js";
import { logStructured } from "../../lib/logger.js";
import { fail, guard, notifyTeam, parseStrategy, requester, saveDoc } from "./approval-doc.js";
import { MEDIA_BY_ID, outletOfSignal } from "./media-outlets.js";
import { creatorById } from "../influencer/creators.js";

export const KINDS = {
    press: { key: "press_release", label: ["Press release", "Siaran pers"] },
    influencer: { key: "influencer_campaign", label: ["Influencer campaign", "Kampanye influencer"] },
    video: { key: "video_brief", label: ["Short videos", "Video pendek"] },
    ads: { key: "ads_plan", label: ["Paid ads", "Iklan berbayar"] },
    social: { key: "social_calendar", label: ["Social media management", "Kelola media sosial"] },
};
const DAY = 86400000;
const PRESS_DELIVERY_DAYS = 7;

const handleKey = (v) => String(v || "").toLowerCase().replace(/^@/, "").replace(/[^a-z0-9._]/g, "");

/** The things to deliver: the picked outlets, or the scheduled creators. */
export function deliveryItems(kind, doc) {
    const acceptedAt = doc?.quote?.acceptedAt;
    if (kind === "press") {
        const due = acceptedAt ? new Date(new Date(acceptedAt).getTime() + PRESS_DELIVERY_DAYS * DAY).toISOString().slice(0, 10) : null;
        return (doc?.media || []).map((id) => MEDIA_BY_ID.get(id)).filter(Boolean).map((o) => ({ id: o.id, name: o.name, sub: o.domain, due }));
    }
    // Service stages (video, ads, social) list their deliverables when the details are saved.
    if (kind !== "influencer") return (doc?.deliverables || []).map(({ id, name, sub, due }) => ({ id, name, sub, due }));
    return (doc?.creators || []).map((it) => {
        const c = creatorById(it.id);
        return c ? { id: c.id, name: `@${c.handle}`, sub: `${c.platform}${c.city ? ` · ${c.city}` : ""}`, due: it.date, handle: c.handle } : null;
    }).filter(Boolean);
}

/** Records collected since acceptance that show an item was published (press: from that outlet; influencer: by that account). */
async function detect(kind, workspaceId, doc, items) {
    const since = doc?.quote?.acceptedAt;
    if (!since || !items.length || !["press", "influencer"].includes(kind)) return new Map();
    const { data } = await db.from("signals").select("url, title, author, metadata, published_at, captured_at")
        .eq("workspace_id", workspaceId).gte("captured_at", since).order("captured_at", { ascending: true }).limit(3000);
    const found = new Map();
    for (const r of data || []) {
        let id = null;
        if (kind === "press") id = outletOfSignal(r);
        else {
            const keys = new Set([handleKey(r.author), handleKey(r.metadata?.username), handleKey(r.metadata?.handle)]);
            id = items.find((it) => it.handle && keys.has(handleKey(it.handle)))?.id || null;
        }
        if (id && items.some((it) => it.id === id) && !found.has(id)) {
            found.set(id, { url: r.url, title: r.title || null, publishedAt: r.published_at || r.captured_at });
        }
    }
    return found;
}

/** Each item with its state: published (auto or by hand), late (past its date), or scheduled. */
export async function deliveryView(kind, workspaceId, doc) {
    if (doc?.quote?.status !== "accepted") return null;
    const items = deliveryItems(kind, doc);
    const auto = await detect(kind, workspaceId, doc, items).catch(() => new Map());
    const manual = doc.delivery || {};
    const today = new Date().toISOString().slice(0, 10);
    const rows = items.map((it) => {
        const m = manual[it.id];
        const a = auto.get(it.id);
        const published = m?.status === "published" ? { ...m, source: "manual" } : a ? { status: "published", url: a.url, title: a.title, publishedAt: a.publishedAt, source: "auto" } : null;
        const { handle: _h, ...rest } = it;
        if (published) return { ...rest, ...published, status: "published" };
        if (m?.status === "cancelled") return { ...rest, status: "cancelled", note: m.note || null };
        return { ...rest, status: it.due && it.due < today ? "late" : "scheduled" };
    });
    const count = (s) => rows.filter((r) => r.status === s).length;
    return { items: rows, published: count("published"), late: count("late"), scheduled: count("scheduled"), cancelled: count("cancelled") };
}

/** Before (14 days before acceptance) and after (since acceptance): volume per day, negative share, AI visibility. */
export async function impactView(workspaceId, plan, doc) {
    const acceptedAt = doc?.quote?.acceptedAt;
    if (doc?.quote?.status !== "accepted" || !acceptedAt) return null;
    const t0 = new Date(acceptedAt).getTime();
    const now = Date.now();
    const afterDays = Math.max(1, (now - t0) / DAY);
    const beforeFrom = new Date(t0 - 14 * DAY).toISOString();
    let signals = [];
    if (plan.cluster_id) {
        const { data: links } = await db.from("narrative_cluster_signals").select("signal_id").eq("cluster_id", plan.cluster_id).limit(2000);
        const ids = (links || []).map((l) => l.signal_id);
        if (ids.length) signals = (await db.from("signals").select("sentiment, captured_at").in("id", ids)).data || [];
    }
    const scope = plan.cluster_id ? "issue" : "brand";
    if (!plan.cluster_id) {
        signals = (await db.from("signals").select("sentiment, captured_at").eq("workspace_id", workspaceId).gte("captured_at", beforeFrom).limit(5000)).data || [];
    }
    const split = (rows) => {
        const before = rows.filter((r) => r.captured_at >= beforeFrom && new Date(r.captured_at).getTime() < t0);
        const after = rows.filter((r) => new Date(r.captured_at).getTime() >= t0);
        const neg = (xs) => (xs.length ? Math.round((xs.filter((x) => String(x.sentiment).toUpperCase() === "NEGATIVE").length / xs.length) * 100) : null);
        return {
            before: { perDay: Number((before.length / 14).toFixed(1)), negative: neg(before), total: before.length },
            after: { perDay: Number((after.length / afterDays).toFixed(1)), negative: neg(after), total: after.length },
        };
    };
    const { data: vis } = await db.from("ai_visibility_results").select("score, created_at").eq("workspace_id", workspaceId).gte("created_at", beforeFrom).limit(2000);
    const avg = (xs) => (xs.length ? Math.round(xs.reduce((s, x) => s + (Number(x.score) || 0), 0) / xs.length) : null);
    const visBefore = (vis || []).filter((v) => new Date(v.created_at).getTime() < t0);
    const visAfter = (vis || []).filter((v) => new Date(v.created_at).getTime() >= t0);
    return { scope, since: acceptedAt, days: Math.floor(afterDays), ...split(signals), aiVisibility: { before: avg(visBefore), after: avg(visAfter) } };
}

const invoiceNumber = (planId, kind, at) => `INV-NRV-${at.slice(0, 7).replace("-", "")}-${kind === "press" ? "PR" : "IC"}${planId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

/** Client-side routes on a stage router: accept/decline the offer, mark an item published or cancelled. */
export function mountFulfilmentRoutes(router, { kind, view }) {
    const { key } = KINDS[kind];

    router.post("/:planId/quote/decision", validateRequest({ body: z.object({ decision: z.enum(["accept", "decline"]), note: z.string().trim().max(500).optional() }) }), async (req, res) => {
        try {
            const ctx = await guard(req, res, "approve");
            if (!ctx) return;
            const doc = ctx.strategy[key];
            if (doc?.quote?.status !== "quoted") return res.status(409).json({ error: "There is no offer to answer yet." });
            const who = await requester(ctx, req);
            const at = new Date().toISOString();
            const accepted = req.body.decision === "accept";
            const quote = { ...doc.quote, status: accepted ? "accepted" : "declined", decidedAt: at, decidedBy: req.user.id, decidedByName: who.name, decisionNote: req.body.note || null, ...(accepted ? { acceptedAt: at } : {}) };
            if (accepted) {
                quote.invoice = { number: invoiceNumber(ctx.plan.id, kind, at), issuedAt: at, dueAt: new Date(Date.now() + 14 * DAY).toISOString(), amount: quote.offer.amount, status: "unpaid" };
            }
            const saved = await saveDoc(ctx, key, { ...doc, quote });
            await notifyTeam({
                subject: `Penawaran ${accepted ? "DISETUJUI" : "ditolak"}: ${who.workspace}`,
                text: [`Penawaran ${KINDS[kind].label[1].toLowerCase()} ${accepted ? "DISETUJUI" : "ditolak"} (Narriv)`, `Workspace: ${who.workspace}`, `Oleh: ${who.name}`, `Rencana aksi: ${ctx.plan.title}`, `Nilai: Rp${Number(quote.offer.amount).toLocaleString("id-ID")}`, accepted ? `Invoice: ${quote.invoice.number}` : "", req.body.note ? `Catatan: ${req.body.note}` : ""].filter(Boolean).join("\n"),
                metadata: { planId: ctx.plan.id },
            });
            await recordAuditLog({ userId: req.user.id, workspaceId: ctx.plan.workspace_id, event: `${kind}_quote_${accepted ? "accepted" : "declined"}`, metadata: { planId: ctx.plan.id, amount: quote.offer.amount } }).catch(() => null);
            return res.json({ data: view(saved) });
        } catch (error) {
            return fail(res, error, `${kind}_quote_decision_failed`);
        }
    });

    const deliveryBody = z.object({ status: z.enum(["published", "cancelled", "scheduled"]), url: z.string().trim().url().max(500).optional(), note: z.string().trim().max(300).optional() });
    router.put("/:planId/delivery/:itemId", validateRequest({ body: deliveryBody }), async (req, res) => {
        try {
            const ctx = await guard(req, res, "edit");
            if (!ctx) return;
            const doc = ctx.strategy[key];
            if (doc?.quote?.status !== "accepted") return res.status(409).json({ error: "Tracking starts once the offer is accepted." });
            if (!deliveryItems(kind, doc).some((it) => it.id === req.params.itemId)) return res.status(404).json({ error: "Not part of this plan." });
            if (req.body.status === "published" && !req.body.url) return res.status(400).json({ error: "Add the link where it was published." });
            const delivery = { ...(doc.delivery || {}) };
            if (req.body.status === "scheduled") delete delivery[req.params.itemId];
            else delivery[req.params.itemId] = { status: req.body.status, url: req.body.url || null, note: req.body.note || null, publishedAt: req.body.status === "published" ? new Date().toISOString() : null, by: req.user.id };
            const saved = await saveDoc(ctx, key, { ...doc, delivery });
            return res.json({ data: view(saved) });
        } catch (error) {
            return fail(res, error, `${kind}_delivery_failed`);
        }
    });
}

// ---- Admin side (Narriv team) ----

/** Every quote across workspaces, newest first. */
export async function listQuotes() {
    const { data: plans } = await db.from("action_plans").select("id, workspace_id, title, strategy, updated_at").order("updated_at", { ascending: false }).limit(2000);
    const rows = [];
    for (const p of plans || []) {
        const s = parseStrategy(p.strategy);
        if (!s) continue;
        for (const [kind, { key }] of Object.entries(KINDS)) {
            const doc = s[key];
            if (!doc?.quote) continue;
            rows.push({
                planId: p.id, kind, workspaceId: p.workspace_id, planTitle: p.title, title: doc.title,
                items: deliveryItems(kind, doc).map(({ id, name, sub, due }) => ({ id, name, sub, due })),
                schedule: doc.schedule || null,
                quote: doc.quote,
            });
        }
    }
    const ids = [...new Set(rows.map((r) => r.workspaceId))];
    const { data: ws } = ids.length ? await db.from("workspaces").select("id, name").in("id", ids) : { data: [] };
    const names = new Map((ws || []).map((w) => [w.id, w.name]));
    return rows.map((r) => ({ ...r, workspace: names.get(r.workspaceId) || "-" }))
        .sort((a, b) => String(b.quote.requestedAt).localeCompare(String(a.quote.requestedAt)));
}

async function loadAdminDoc(planId, kind) {
    const { data: plan } = await db.from("action_plans").select("id, workspace_id, title, strategy").eq("id", planId).maybeSingle();
    const strategy = parseStrategy(plan?.strategy);
    const doc = strategy?.[KINDS[kind].key];
    if (!plan || !doc?.quote) return null;
    return { ctx: { plan, strategy }, doc };
}

/** The team's price for a requested quote; the requester is told by email. */
export async function setOffer({ planId, kind, amount, notes, validDays, adminId }) {
    const found = await loadAdminDoc(planId, kind);
    if (!found) return { error: "Quote not found", status: 404 };
    const { ctx, doc } = found;
    if (!["requested", "quoted", undefined].includes(doc.quote.status)) return { error: "This quote was already answered by the client.", status: 409 };
    const at = new Date().toISOString();
    const quote = { ...doc.quote, status: "quoted", quotedAt: at, offer: { amount, notes: notes || null, validUntil: new Date(Date.now() + validDays * DAY).toISOString() } };
    await saveDoc(ctx, KINDS[kind].key, { ...doc, quote });
    await recordAuditLog({ userId: adminId, workspaceId: ctx.plan.workspace_id, event: `${kind}_quote_offered`, metadata: { planId, amount } }).catch(() => null);
    // Tell the person who asked.
    try {
        const { data: u } = await db.from("users").select("email").eq("id", doc.quote.by).maybeSingle();
        if (u?.email && isEmailConfigured()) {
            const text = `Penawaran untuk ${KINDS[kind].label[1].toLowerCase()} "${doc.title}" sudah siap: Rp${Number(amount).toLocaleString("id-ID")}.\n${notes ? `${notes}\n` : ""}Buka rencana aksi "${ctx.plan.title}" di Narriv untuk menyetujui atau menolaknya.`;
            await sendEmail({ to: u.email, subject: `Penawaran siap: ${doc.title}`, text, html: `<p style="font:15px/1.6 sans-serif;white-space:pre-wrap">${text.replace(/[<&>]/g, (c) => ({ "<": "&lt;", "&": "&amp;", ">": "&gt;" }[c]))}</p>` });
        }
    } catch (error) {
        logStructured("warn", "quote_offer_email_failed", { error: error?.message || error });
    }
    return { quote };
}

export async function setInvoicePaid({ planId, kind, paid, adminId }) {
    const found = await loadAdminDoc(planId, kind);
    if (!found?.doc.quote.invoice) return { error: "Invoice not found", status: 404 };
    const { ctx, doc } = found;
    const quote = { ...doc.quote, invoice: { ...doc.quote.invoice, status: paid ? "paid" : "unpaid", paidAt: paid ? new Date().toISOString() : null } };
    await saveDoc(ctx, KINDS[kind].key, { ...doc, quote });
    await recordAuditLog({ userId: adminId, workspaceId: ctx.plan.workspace_id, event: `${kind}_invoice_${paid ? "paid" : "unpaid"}`, metadata: { planId } }).catch(() => null);
    return { quote };
}
