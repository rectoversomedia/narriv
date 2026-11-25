/**
 * A document an action plan produces that a person must approve before anything goes out (the press release, the
 * influencer brief). Shared rules:
 *   - AI or a person writes a version; every version waits for an owner/admin's approval.
 *   - The reviewer approves it, or asks for a revision with a note and the AI rewrites it (a new version, again waiting).
 *   - Editing an approved document makes it wait for approval again.
 * Stored in action_plans.strategy (a JSON text) under the document's key, so no schema change is needed.
 */
import { z } from "zod";
import { validateRequest } from "../../middlewares/validate-request.js";
import { baseSupabaseAdmin as db } from "../../lib/supabase.js";
import { MANAGER_ROLES, getWorkspaceRole, resolveScopedWorkspaceIds } from "../../lib/workspace-access.js";
import { recordAuditLog } from "../../lib/audit.js";
import { logStructured } from "../../lib/logger.js";
import { sendEmail, isEmailConfigured } from "../../lib/email.js";
import { createWhatsAppProvider } from "../notifications/notification-providers.js";

export const MAX_VERSIONS = 12;
export const isDemo = (req) => String(req.user?.id || "").startsWith("demo");
export const canEdit = (role) => Boolean(role) && role !== "viewer";
export const canApprove = (role) => MANAGER_ROLES.includes(role);

export const parseStrategy = (raw) => {
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
export async function loadPlan(req) {
    const scoped = await resolveScopedWorkspaceIds(req.user.id, null);
    const { data: plan } = await db.from("action_plans")
        .select("id, workspace_id, title, description, type, strategy, cluster_id, alert_id, status")
        .eq("id", req.params.planId).maybeSingle();
    if (!plan || !scoped.includes(plan.workspace_id)) return null;
    const role = isDemo(req) ? "viewer" : await getWorkspaceRole(req.user.id, plan.workspace_id);
    return { plan, role, strategy: parseStrategy(plan.strategy) };
}

export async function saveDoc(ctx, key, doc) {
    const strategy = { ...(ctx.strategy || {}), [key]: doc };
    const { error } = await db.from("action_plans").update({ strategy: JSON.stringify(strategy), updated_at: new Date().toISOString() }).eq("id", ctx.plan.id);
    if (error) throw error;
    ctx.strategy = strategy;
    return doc;
}

export const userName = async (id) => {
    const { data } = await db.from("users").select("name, email").eq("id", id).maybeSingle();
    return data?.name || data?.email || null;
};

/** Add a version (the text as it stood) to the history, newest first, bounded. */
export function withVersion(doc, { title, body, by, byName, source, note = null }) {
    const version = (doc?.version || 0) + 1;
    const at = new Date().toISOString();
    return {
        ...(doc || {}),
        title,
        body,
        version,
        status: "pending_approval",
        updatedAt: at,
        revisionNote: null,
        approvedBy: null,
        approvedByName: null,
        approvedAt: null,
        history: [{ version, at, by, byName, source, note }, ...((doc?.history) || [])].slice(0, MAX_VERSIONS * 2),
        versions: [{ version, title, body }, ...((doc?.versions) || [])].slice(0, MAX_VERSIONS),
    };
}

/** The document without the stored copies of earlier texts beyond the previous one. */
export function docView(doc) {
    if (!doc) return null;
    const { versions = [], ...rest } = doc;
    return { ...rest, previous: versions[1] || null };
}

export async function guard(req, res, need) {
    if (isDemo(req)) { res.status(403).json({ error: "The demo is read-only." }); return null; }
    const ctx = await loadPlan(req);
    if (!ctx) { res.status(404).json({ error: "Action plan not found" }); return null; }
    if (!ctx.strategy) { res.status(409).json({ error: "This plan cannot hold this document." }); return null; }
    if (need === "edit" && !canEdit(ctx.role)) { res.status(403).json({ error: "Viewers cannot edit." }); return null; }
    if (need === "approve" && !canApprove(ctx.role)) { res.status(403).json({ error: "Only an owner or admin can approve or ask for a revision." }); return null; }
    return ctx;
}

export function fail(res, error, event) {
    logStructured("error", event, { error: error?.message || error });
    return res.status(error?.status || 500).json({ error: error?.status ? error.message : "Something went wrong. Try again." });
}

/** Who asks and for which workspace, for a message to the Narriv team. */
export async function requester(ctx, req) {
    const [{ data: ws }, { data: u }] = await Promise.all([
        db.from("workspaces").select("name").eq("id", ctx?.plan?.workspace_id || ctx?.workspaceId).maybeSingle(),
        db.from("users").select("name, email").eq("id", req.user.id).maybeSingle(),
    ]);
    return { workspace: ws?.name || "-", name: u?.name || u?.email || "-", email: u?.email || null };
}

/** A message to the Narriv team (quote and access requests): WhatsApp and/or email; false when neither went out. */
export async function notifyTeam({ subject, text, metadata }) {
    const delivered = [];
    const wa = process.env.PRESS_QUOTE_WHATSAPP;
    if (wa) {
        const r = await createWhatsAppProvider().send({ to: wa, subject, text, metadata });
        if (r.delivered) delivered.push("whatsapp");
    }
    const mail = process.env.PRESS_QUOTE_EMAIL;
    if (mail && isEmailConfigured()) {
        const html = `<pre style="font:14px/1.5 sans-serif;white-space:pre-wrap">${text.replace(/[<&>]/g, (ch) => ({ "<": "&lt;", "&": "&amp;", ">": "&gt;" }[ch]))}</pre>`;
        const ok = await sendEmail({ to: mail, subject, text, html }).catch(() => null);
        if (ok) delivered.push("email");
    }
    if (!delivered.length) logStructured("error", "team_request_undelivered", { subject, whatsapp: Boolean(wa), email: Boolean(mail), ...metadata });
    return delivered.length > 0;
}

/**
 * POST /:planId/draft, PUT /:planId and POST /:planId/review for one document key.
 * write(ctx, { note, current }) returns { title, body }; view(doc) shapes the response.
 */
export function mountApprovalRoutes(router, { key, event, write, view, bodyMax = 8000 }) {
    router.post("/:planId/draft", async (req, res) => {
        try {
            const ctx = await guard(req, res, "edit");
            if (!ctx) return;
            const current = ctx.strategy[key];
            if (current?.status === "approved") return res.status(409).json({ error: "It is approved. Edit it to start a new version." });
            const text = await write(ctx, { current: current ? { title: current.title, body: current.body } : null });
            const doc = await saveDoc(ctx, key, withVersion(current, { ...text, by: req.user.id, byName: await userName(req.user.id), source: "ai" }));
            await recordAuditLog({ userId: req.user.id, workspaceId: ctx.plan.workspace_id, event: `${event}_drafted`, metadata: { planId: ctx.plan.id, version: doc.version } }).catch(() => null);
            return res.status(201).json({ data: view(doc) });
        } catch (error) {
            return fail(res, error, `${event}_draft_failed`);
        }
    });

    const editBody = z.object({ title: z.string().trim().min(5).max(200), body: z.string().trim().min(50).max(bodyMax) });
    router.put("/:planId", validateRequest({ body: editBody }), async (req, res) => {
        try {
            const ctx = await guard(req, res, "edit");
            if (!ctx) return;
            const current = ctx.strategy[key];
            if (!current) return res.status(404).json({ error: "Write a draft first." });
            if (current.title === req.body.title && current.body === req.body.body) return res.json({ data: view(current) });
            // Any change, even to an approved document, needs a new approval; what was chosen after it stays.
            const doc = await saveDoc(ctx, key, withVersion(current, { ...req.body, by: req.user.id, byName: await userName(req.user.id), source: "edit" }));
            await recordAuditLog({ userId: req.user.id, workspaceId: ctx.plan.workspace_id, event: `${event}_edited`, metadata: { planId: ctx.plan.id, version: doc.version } }).catch(() => null);
            return res.json({ data: view(doc) });
        } catch (error) {
            return fail(res, error, `${event}_edit_failed`);
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
            const current = ctx.strategy[key];
            if (!current) return res.status(404).json({ error: "Write a draft first." });
            if (current.status !== "pending_approval") return res.status(409).json({ error: "Only a version awaiting approval can be reviewed." });
            const name = await userName(req.user.id);
            let doc;
            if (req.body.decision === "approve") {
                const at = new Date().toISOString();
                doc = { ...current, status: "approved", approvedBy: req.user.id, approvedByName: name, approvedAt: at,
                    history: [{ version: current.version, at, by: req.user.id, byName: name, source: "approved" }, ...(current.history || [])].slice(0, MAX_VERSIONS * 2) };
            } else {
                // The reviewer's note goes straight to the writer: the new version is back for approval.
                const text = await write(ctx, { note: req.body.note, current: { title: current.title, body: current.body } });
                doc = withVersion(current, { ...text, by: req.user.id, byName: name, source: "revision", note: req.body.note });
                doc.revisionNote = req.body.note;
            }
            await saveDoc(ctx, key, doc);
            await recordAuditLog({ userId: req.user.id, workspaceId: ctx.plan.workspace_id, event: req.body.decision === "approve" ? `${event}_approved` : `${event}_revision_requested`, metadata: { planId: ctx.plan.id, version: doc.version } }).catch(() => null);
            return res.json({ data: view(doc) });
        } catch (error) {
            return fail(res, error, `${event}_review_failed`);
        }
    });
}
