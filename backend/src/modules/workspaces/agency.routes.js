/**
 * For agencies that run several client workspaces from one login.
 *
 * GET  /workspaces/portfolio      every workspace the user belongs to, with what needs attention in each
 *                                 (open high-risk alerts, issues and mentions in the last 24 hours, the top issue)
 * GET  /workspaces/white-label    the selected workspace's white-label settings
 * PUT  /workspaces/white-label    save them (owner/admin); applyToAll copies them to every workspace the user manages
 * POST /workspaces/white-label/logo   upload the agency logo (PNG or JPEG, base64), returns its public URL
 *
 * White-label lives in workspaces.settings.whiteLabel = { enabled, agencyName, logoUrl, color }. Report PDFs and
 * report emails then carry the agency's name, logo and colour instead of Narriv's.
 */
import express from "express";
import crypto from "crypto";
import { z } from "zod";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { baseSupabaseAdmin as db } from "../../lib/supabase.js";
import { MANAGER_ROLES, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { ensureBucket, detectImageType } from "../workspace-settings/workspace-logo.controller.js";
import { logStructured } from "../../lib/logger.js";
import { entitlementsFor, FEATURES } from "../../lib/entitlements.js";
import { isPlatformAdmin } from "../../lib/platform-admin.js";
import { notifyTeam, requester } from "../press/approval-doc.js";

const router = express.Router();
router.use(verifyToken);
const isDemo = (req) => String(req.user?.id || "").startsWith("demo");
const DAY = 24 * 60 * 60 * 1000;

// GET /workspaces/entitlements: the selected workspace's plan, what it includes, and its limits.
router.get("/entitlements", async (req, res) => {
    try {
        const admin = await isPlatformAdmin(req.user.id);
        if (isDemo(req)) return res.json({ data: entitlementsFor({}, { admin: false }) });
        const id = await resolveWorkspaceIdForUser(req.user.id);
        if (!id) return res.status(404).json({ error: "No workspace" });
        const { data } = await db.from("workspaces").select("settings").eq("id", id).maybeSingle();
        return res.json({ data: entitlementsFor(data?.settings || {}, { admin }) });
    } catch (error) {
        logStructured("error", "entitlements_failed", { error: error?.message || error });
        return res.status(500).json({ error: "Plan details could not be loaded." });
    }
});

// POST /workspaces/upgrade-request { feature?, plan? }: tell the Narriv team a client wants more.
router.post("/upgrade-request", validateRequest({ body: z.object({ feature: z.enum(Object.keys(FEATURES)).optional(), plan: z.enum(["starter", "pilot", "intelligence", "decision", "command"]).optional(), note: z.string().trim().max(500).optional() }) }), async (req, res) => {
    try {
        if (isDemo(req)) return res.status(403).json({ error: "The demo is read-only." });
        const ws = await currentWorkspace(req);
        if (!ws) return res.status(404).json({ error: "No workspace" });
        const who = await requester({ workspaceId: ws.id }, req);
        const { data } = await db.from("workspaces").select("settings").eq("id", ws.id).maybeSingle();
        const current = entitlementsFor(data?.settings || {});
        const want = req.body.plan || (req.body.feature ? FEATURES[req.body.feature] : null);
        const sent = await notifyTeam({
            subject: `Permintaan upgrade: ${who.workspace}`,
            text: [`Permintaan upgrade paket (Narriv)`, `Workspace: ${who.workspace}`, `Oleh: ${who.name}${who.email ? ` (${who.email})` : ""}`, `Paket sekarang: ${data?.settings?.plan || "-"}`, want ? `Ingin: ${want}` : "", req.body.feature ? `Fitur yang dibuka: ${req.body.feature}` : "", req.body.note ? `Catatan: ${req.body.note}` : "", `Ubah paket di panel admin Narriv.`].filter(Boolean).join("\n"),
            metadata: { workspaceId: ws.id, from: current.effectivePlan, want },
        });
        if (!sent) return res.status(503).json({ error: "The request could not be sent. Try again in a moment." });
        return res.json({ ok: true });
    } catch (error) {
        logStructured("error", "upgrade_request_failed", { error: error?.message || error });
        return res.status(500).json({ error: "The request could not be sent." });
    }
});

router.get("/portfolio", async (req, res) => {
    try {
        if (isDemo(req)) return res.json({ data: [] });
        const { data: memberships, error } = await db.from("workspace_members").select("workspace_id, role").eq("user_id", req.user.id);
        if (error) throw error;
        const ids = (memberships || []).map((m) => m.workspace_id);
        if (!ids.length) return res.json({ data: [] });
        const since = new Date(Date.now() - DAY).toISOString();
        const [{ data: workspaces }, { data: alerts }, { data: issues }, { data: settings }] = await Promise.all([
            db.from("workspaces").select("id, name, logo_url, created_at").in("id", ids),
            db.from("alerts").select("workspace_id, severity, title, created_at").in("workspace_id", ids).eq("status", "open").in("severity", ["critical", "high"]).order("created_at", { ascending: false }).limit(500),
            db.from("narrative_clusters").select("workspace_id, title, impact, signal_count, updated_at").in("workspace_id", ids).gte("updated_at", since).order("signal_count", { ascending: false }).limit(500),
            db.from("workspace_settings").select("workspace_id, brand_name").in("workspace_id", ids),
        ]);
        const mentions = await Promise.all(ids.map((id) =>
            db.from("signals").select("id", { count: "exact", head: true }).eq("workspace_id", id).gte("captured_at", since).then(({ count }) => [id, count || 0])));
        const mentionCount = new Map(mentions);
        const brand = new Map((settings || []).map((s) => [s.workspace_id, s.brand_name]));
        const IMPACT = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const data = (memberships || []).map((m) => {
            const ws = (workspaces || []).find((w) => w.id === m.workspace_id);
            if (!ws) return null;
            const wsAlerts = (alerts || []).filter((a) => a.workspace_id === ws.id);
            const wsIssues = (issues || []).filter((c) => c.workspace_id === ws.id);
            const top = wsIssues.slice().sort((a, b) => (IMPACT[b.impact] || 0) - (IMPACT[a.impact] || 0) || (b.signal_count || 0) - (a.signal_count || 0))[0] || null;
            const critical = wsAlerts.filter((a) => a.severity === "critical").length;
            const status = critical > 0 ? "critical" : wsAlerts.length > 0 ? "attention" : "calm";
            return {
                id: ws.id,
                name: ws.name,
                brand: brand.get(ws.id) || null,
                logoUrl: ws.logo_url || null,
                role: m.role,
                status,
                openAlerts: { critical, high: wsAlerts.length - critical, latest: wsAlerts[0]?.title || null },
                issues24h: wsIssues.length,
                mentions24h: mentionCount.get(ws.id) || 0,
                topIssue: top ? { title: top.title, impact: top.impact, signals: top.signal_count || 0 } : null,
            };
        }).filter(Boolean);
        const RANK = { critical: 0, attention: 1, calm: 2 };
        data.sort((a, b) => RANK[a.status] - RANK[b.status] || b.mentions24h - a.mentions24h);
        return res.json({ data });
    } catch (error) {
        logStructured("error", "portfolio_failed", { error: error?.message || error });
        return res.status(500).json({ error: "Client overview could not be loaded." });
    }
});

const colorRe = /^#[0-9a-fA-F]{6}$/;
const whiteLabelBody = z.object({
    enabled: z.boolean(),
    agencyName: z.string().trim().max(80).optional().default(""),
    logoUrl: z.string().trim().url().max(500).nullable().optional(),
    color: z.string().trim().regex(colorRe, "Colour must look like #3247D9").nullable().optional(),
    applyToAll: z.boolean().optional().default(false),
});

const clean = (v = {}) => ({
    enabled: Boolean(v.enabled),
    agencyName: String(v.agencyName || "").trim(),
    logoUrl: v.logoUrl || null,
    color: colorRe.test(String(v.color || "")) ? v.color : null,
});

async function currentWorkspace(req) {
    const id = await resolveWorkspaceIdForUser(req.user.id);
    if (!id) return null;
    const { data: m } = await db.from("workspace_members").select("role").eq("user_id", req.user.id).eq("workspace_id", id).maybeSingle();
    return { id, role: m?.role || null };
}

router.get("/white-label", async (req, res) => {
    try {
        if (isDemo(req)) return res.json({ data: clean({}), canEdit: false });
        const ws = await currentWorkspace(req);
        if (!ws) return res.status(404).json({ error: "No workspace" });
        const { data } = await db.from("workspaces").select("settings").eq("id", ws.id).maybeSingle();
        return res.json({ data: clean(data?.settings?.whiteLabel), canEdit: MANAGER_ROLES.includes(ws.role) });
    } catch (error) {
        logStructured("error", "white_label_read_failed", { error: error?.message || error });
        return res.status(500).json({ error: "White-label settings could not be loaded." });
    }
});

router.put("/white-label", validateRequest({ body: whiteLabelBody }), async (req, res) => {
    try {
        if (isDemo(req)) return res.status(403).json({ error: "The demo is read-only." });
        const ws = await currentWorkspace(req);
        if (!ws || !MANAGER_ROLES.includes(ws.role)) return res.status(403).json({ error: "Only an owner or admin can change white-label settings." });
        const value = clean(req.body);
        if (value.enabled && !value.agencyName) return res.status(400).json({ error: "Agency name is required." });
        let targets = [ws.id];
        if (req.body.applyToAll) {
            const { data: managed } = await db.from("workspace_members").select("workspace_id").eq("user_id", req.user.id).in("role", MANAGER_ROLES);
            targets = [...new Set([ws.id, ...(managed || []).map((m) => m.workspace_id)])];
        }
        const { data: rows } = await db.from("workspaces").select("id, settings").in("id", targets);
        for (const row of rows || []) {
            const { error } = await db.from("workspaces").update({ settings: { ...(row.settings || {}), whiteLabel: value } }).eq("id", row.id);
            if (error) throw error;
        }
        return res.json({ data: value, updated: (rows || []).length });
    } catch (error) {
        logStructured("error", "white_label_save_failed", { error: error?.message || error });
        return res.status(500).json({ error: "White-label settings could not be saved." });
    }
});

router.post("/white-label/logo", async (req, res) => {
    try {
        if (isDemo(req)) return res.status(403).json({ error: "The demo is read-only." });
        const ws = await currentWorkspace(req);
        if (!ws || !MANAGER_ROLES.includes(ws.role)) return res.status(403).json({ error: "Only an owner or admin can upload the agency logo." });
        const raw = String(req.body?.file || "").replace(/^data:[^,]+,/, "");
        const buffer = Buffer.from(raw, "base64");
        if (!buffer.length || buffer.length > 1024 * 1024) return res.status(400).json({ error: "The logo must be an image up to 1 MB." });
        const type = detectImageType(buffer);
        // Report PDFs can draw PNG and JPEG only.
        if (!type || type.ext === "webp") return res.status(400).json({ error: "Use a PNG or JPEG logo." });
        await ensureBucket();
        const path = `agency/${req.user.id}/${crypto.randomUUID()}.${type.ext}`;
        const { error } = await db.storage.from("workspace-logos").upload(path, buffer, { contentType: type.mime, upsert: false });
        if (error) throw error;
        return res.json({ url: db.storage.from("workspace-logos").getPublicUrl(path).data.publicUrl });
    } catch (error) {
        logStructured("error", "white_label_logo_failed", { error: error?.message || error });
        return res.status(500).json({ error: "The logo could not be uploaded." });
    }
});

export default router;
