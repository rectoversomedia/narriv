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
import { MANAGER_ROLES, getWorkspaceRole, resolveScopedWorkspaceIds } from "../../lib/workspace-access.js";
import { runAiTask } from "../../lib/ai-gateway.js";
import { requestLang } from "../../lib/request-context.js";
import { recordAuditLog } from "../../lib/audit.js";
import { logStructured } from "../../lib/logger.js";
import { sendEmail, isEmailConfigured } from "../../lib/email.js";
import { createWhatsAppProvider } from "../notifications/notification-providers.js";
import { MEDIA_OUTLETS, MEDIA_BY_ID } from "./media-outlets.js";

const router = express.Router();
router.use(verifyToken);

const isDemo = (req) => String(req.user?.id || "").startsWith("demo");
const MAX_OUTLETS = 60;
const MAX_VERSIONS = 12;

const parseStrategy = (raw) => {
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    try {
        const v = JSON.parse(raw);
        return v && typeof v === "object" && !Array.isArray(v) ? v : null;
    } catch {
        return null;
    }
};

/** The plan, the caller's role in its workspace and the parsed strategy; null when the caller cannot see it. */
async function loadPlan(req) {
    const scoped = await resolveScopedWorkspaceIds(req.user.id, null);
    const { data: plan } = await db.from("action_plans")
        .select("id, workspace_id, title, description, type, strategy, cluster_id, alert_id, status")
        .eq("id", req.params.planId).maybeSingle();
    if (!plan || !scoped.includes(plan.workspace_id)) return null;
    const role = isDemo(req) ? "viewer" : await getWorkspaceRole(req.user.id, plan.workspace_id);
    return { plan, role, strategy: parseStrategy(plan.strategy) };
}

const canEdit = (role) => Boolean(role) && role !== "viewer";
const canApprove = (role) => MANAGER_ROLES.includes(role);

async function saveRelease(ctx, release) {
    const strategy = { ...(ctx.strategy || {}), press_release: release };
    const { error } = await db.from("action_plans").update({ strategy: JSON.stringify(strategy), updated_at: new Date().toISOString() }).eq("id", ctx.plan.id);
    if (error) throw error;
    ctx.strategy = strategy;
    return release;
}

const userName = async (id) => {
    const { data } = await db.from("users").select("name, email").eq("id", id).maybeSingle();
    return data?.name || data?.email || null;
};

/** Add a version (the text as it stood) to the history, newest first, bounded. */
function withVersion(release, { title, body, by, byName, source, note = null }) {
    const version = (release?.version || 0) + 1;
    const at = new Date().toISOString();
    return {
        ...(release || {}),
        title,
        body,
        version,
        status: "pending_approval",
        updatedAt: at,
        revisionNote: null,
        approvedBy: null,
        approvedByName: null,
        approvedAt: null,
        history: [{ version, at, by, byName, source, note }, ...((release?.history) || [])].slice(0, MAX_VERSIONS),
        versions: [{ version, title, body }, ...((release?.versions) || [])].slice(0, MAX_VERSIONS),
    };
}

/** What the reader sees: the release without the stored copies of earlier texts beyond the previous one. */
function view(release) {
    if (!release) return null;
    const { versions = [], ...rest } = release;
    return { ...rest, previous: versions[1] || null, picked: (release.media || []).map((id) => MEDIA_BY_ID.get(id)).filter(Boolean) };
}

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
const norm = (v) => String(v || "").toLowerCase().replace(/^www\./, "").replace(/[^a-z0-9]/g, "");
const OUTLET_KEYS = (() => {
    const keys = new Map();
    for (const o of MEDIA_OUTLETS) {
        for (const k of [norm(o.name), norm(o.domain), norm(o.domain.split(".")[0])]) if (k.length >= 4 && !keys.has(k)) keys.set(k, o.id);
    }
    return keys;
})();
export function outletOfSignal(row) {
    const byName = OUTLET_KEYS.get(norm(row?.metadata?.publisher));
    if (byName) return byName;
    try {
        const host = new URL(row.url).hostname.replace(/^www\./, "");
        if (host.endsWith("google.com")) return null;
        const parts = host.split(".");
        for (let i = 0; i < parts.length - 1; i++) {
            const id = OUTLET_KEYS.get(norm(parts.slice(i).join(".")));
            if (id) return id;
        }
    } catch { /* not a URL */ }
    return null;
}

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

router.get("/media", (_req, res) => res.json({ data: MEDIA_OUTLETS }));

router.get("/:planId", async (req, res) => {
    try {
        const ctx = await loadPlan(req);
        if (!ctx) return res.status(404).json({ error: "Action plan not found" });
        return res.json({
            data: view(ctx.strategy?.press_release || null),
            canEdit: canEdit(ctx.role),
            canApprove: canApprove(ctx.role),
            recommended: await recommendations(ctx).catch(() => ({})),
        });
    } catch (error) {
        logStructured("error", "press_release_read_failed", { error: error?.message || error });
        return res.status(500).json({ error: "The press release could not be loaded." });
    }
});

const guard = async (req, res, need) => {
    if (isDemo(req)) { res.status(403).json({ error: "The demo is read-only." }); return null; }
    const ctx = await loadPlan(req);
    if (!ctx) { res.status(404).json({ error: "Action plan not found" }); return null; }
    if (!ctx.strategy) { res.status(409).json({ error: "This plan cannot hold a press release." }); return null; }
    if (need === "edit" && !canEdit(ctx.role)) { res.status(403).json({ error: "Viewers cannot edit the press release." }); return null; }
    if (need === "approve" && !canApprove(ctx.role)) { res.status(403).json({ error: "Only an owner or admin can approve or ask for a revision." }); return null; }
    return ctx;
};

const fail = (res, error, event) => {
    logStructured("error", event, { error: error?.message || error });
    return res.status(error?.status || 500).json({ error: error?.status ? error.message : "Something went wrong. Try again." });
};

router.post("/:planId/draft", async (req, res) => {
    try {
        const ctx = await guard(req, res, "edit");
        if (!ctx) return;
        const current = ctx.strategy.press_release;
        if (current?.status === "approved") return res.status(409).json({ error: "The release is approved. Edit it to start a new version." });
        const text = await writeRelease(ctx, { current: current ? { title: current.title, body: current.body } : null });
        const release = await saveRelease(ctx, withVersion(current, { ...text, by: req.user.id, byName: await userName(req.user.id), source: "ai" }));
        await recordAuditLog({ userId: req.user.id, workspaceId: ctx.plan.workspace_id, event: "press_release_drafted", metadata: { planId: ctx.plan.id, version: release.version } }).catch(() => null);
        return res.status(201).json({ data: view(release) });
    } catch (error) {
        return fail(res, error, "press_release_draft_failed");
    }
});

const editBody = z.object({ title: z.string().trim().min(5).max(200), body: z.string().trim().min(50).max(8000) });

router.put("/:planId", validateRequest({ body: editBody }), async (req, res) => {
    try {
        const ctx = await guard(req, res, "edit");
        if (!ctx) return;
        const current = ctx.strategy.press_release;
        if (!current) return res.status(404).json({ error: "Write a draft first." });
        if (current.title === req.body.title && current.body === req.body.body) return res.json({ data: view(current) });
        // Any change, even to an approved release, needs a new approval; the picked outlets stay.
        const release = await saveRelease(ctx, withVersion(current, { ...req.body, by: req.user.id, byName: await userName(req.user.id), source: "edit" }));
        await recordAuditLog({ userId: req.user.id, workspaceId: ctx.plan.workspace_id, event: "press_release_edited", metadata: { planId: ctx.plan.id, version: release.version } }).catch(() => null);
        return res.json({ data: view(release) });
    } catch (error) {
        return fail(res, error, "press_release_edit_failed");
    }
});

const reviewBody = z.discriminatedUnion("decision", [
    z.object({ decision: z.literal("approve") }),
    z.object({ decision: z.literal("revise"), note: z.string().trim().min(5, "Say what should change.").max(1500) }),
]);

router.post("/:planId/review", validateRequest({ body: reviewBody }), async (req, res) => {
    try {
        const ctx = await guard(req, res, "approve");
        if (!ctx) return;
        const current = ctx.strategy.press_release;
        if (!current) return res.status(404).json({ error: "Write a draft first." });
        if (current.status !== "pending_approval") return res.status(409).json({ error: "Only a release awaiting approval can be reviewed." });
        const name = await userName(req.user.id);
        let release;
        if (req.body.decision === "approve") {
            const at = new Date().toISOString();
            release = { ...current, status: "approved", approvedBy: req.user.id, approvedByName: name, approvedAt: at,
                history: [{ version: current.version, at, by: req.user.id, byName: name, source: "approved" }, ...(current.history || [])].slice(0, MAX_VERSIONS * 2) };
        } else {
            // The reviewer's note goes straight to the writer: the new version is back for approval.
            const text = await writeRelease(ctx, { note: req.body.note, current: { title: current.title, body: current.body } });
            release = withVersion(current, { ...text, by: req.user.id, byName: name, source: "revision", note: req.body.note });
            release.revisionNote = req.body.note;
        }
        await saveRelease(ctx, release);
        await recordAuditLog({ userId: req.user.id, workspaceId: ctx.plan.workspace_id, event: req.body.decision === "approve" ? "press_release_approved" : "press_release_revision_requested", metadata: { planId: ctx.plan.id, version: release.version } }).catch(() => null);
        return res.json({ data: view(release) });
    } catch (error) {
        return fail(res, error, "press_release_review_failed");
    }
});

const mediaBody = z.object({ outletIds: z.array(z.string().max(80)).max(MAX_OUTLETS) });

router.put("/:planId/media", validateRequest({ body: mediaBody }), async (req, res) => {
    try {
        const ctx = await guard(req, res, "edit");
        if (!ctx) return;
        const current = ctx.strategy.press_release;
        if (current?.status !== "approved") return res.status(409).json({ error: "Approve the press release before choosing media." });
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
        const outlets = (current.media || []).map((id) => MEDIA_BY_ID.get(id)).filter(Boolean);
        if (!outlets.length) return res.status(400).json({ error: "Choose at least one outlet." });
        const [{ data: ws }, name, { data: u }] = await Promise.all([
            db.from("workspaces").select("name").eq("id", ctx.plan.workspace_id).maybeSingle(),
            userName(req.user.id),
            db.from("users").select("email").eq("id", req.user.id).maybeSingle(),
        ]);
        const at = new Date().toISOString();
        const tiers = [1, 2, 3, 4].map((t) => outlets.filter((o) => o.tier === t).length);
        const text = [
            `Permintaan penawaran siaran pers (Narriv)`,
            `Workspace: ${ws?.name || ctx.plan.workspace_id}`,
            `Diminta oleh: ${name || "-"}${u?.email ? ` (${u.email})` : ""}`,
            `Rencana aksi: ${ctx.plan.title}`,
            `Judul rilis: ${current.title}`,
            `${outlets.length} media: Tier 1 ${tiers[0]} · Tier 2 ${tiers[1]} · Tier 3 ${tiers[2]} · Tier 4 ${tiers[3]}`,
            outlets.map((o) => `- ${o.name} (T${o.tier})`).join("\n"),
            req.body.note ? `Catatan: ${req.body.note}` : "",
        ].filter(Boolean).join("\n");

        const delivered = [];
        const wa = process.env.PRESS_QUOTE_WHATSAPP;
        if (wa) {
            const r = await createWhatsAppProvider().send({ to: wa, subject: "Press release quote", text, metadata: { planId: ctx.plan.id } });
            if (r.delivered) delivered.push("whatsapp");
        }
        const mail = process.env.PRESS_QUOTE_EMAIL;
        if (mail && isEmailConfigured()) {
            const ok = await sendEmail({ to: mail, subject: `Permintaan penawaran rilis: ${ws?.name || ""} · ${outlets.length} media`, text, html: `<pre style="font:14px/1.5 sans-serif;white-space:pre-wrap">${text.replace(/[<&>]/g, (ch) => ({ "<": "&lt;", "&": "&amp;", ">": "&gt;" }[ch]))}</pre>` }).catch(() => null);
            if (ok) delivered.push("email");
        }
        if (!delivered.length) {
            logStructured("error", "press_quote_undelivered", { planId: ctx.plan.id, whatsapp: Boolean(wa), email: Boolean(mail) });
            return res.status(503).json({ error: "The request could not be sent. Try again in a moment." });
        }
        const release = await saveRelease(ctx, { ...current, quote: { requestedAt: at, by: req.user.id, byName: name, outlets: outlets.length, note: req.body.note || null } });
        await recordAuditLog({ userId: req.user.id, workspaceId: ctx.plan.workspace_id, event: "press_release_quote_requested", metadata: { planId: ctx.plan.id, outlets: outlets.length } }).catch(() => null);
        return res.json({ data: view(release) });
    } catch (error) {
        return fail(res, error, "press_release_quote_failed");
    }
});

export default router;
