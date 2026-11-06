/**
 * The Narriv team's admin panel: every client workspace with its plan, trial, usage and cost, and the switches the
 * team controls (plan, trial end, monitoring pause, social collection).
 *
 * GET   /admin/platform/me                  { isAdmin } for the signed-in user (anyone may ask)
 * GET   /admin/platform/workspaces          every workspace with its numbers           (platform admins only)
 * PATCH /admin/platform/workspaces/:id      change plan / trial / pause / social        (platform admins only)
 *
 * Access is by email (PLATFORM_ADMIN_EMAILS), checked against the users table on every request. Every change is
 * audit-logged on the workspace it touched.
 */
import express from "express";
import { z } from "zod";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { baseSupabaseAdmin as db } from "../../lib/supabase.js";
import { recordAuditLog } from "../../lib/audit.js";
import { logStructured } from "../../lib/logger.js";
import { DEMO_WORKSPACE_ID } from "../../lib/workspace-access.js";
import { isPlatformAdmin, requirePlatformAdmin } from "../../lib/platform-admin.js";
import { PLAN_KEYS, planStatus } from "../../lib/workspace-plan.js";
import { calculateCost } from "../../lib/model-pricing.js";
import { PLATFORM_PRESET, runSpend, socialConfig, totalCapUsd } from "../ingestion/social-schedule.service.js";
import { COLLECTION_JOB_NAME } from "../ingestion/apify-collection.service.js";

const router = express.Router();
router.use(verifyToken);

const DAY_MS = 24 * 60 * 60 * 1000;
// Providers bill in US dollars; the panel shows rupiah at this rate (env USD_IDR_RATE).
const usdToIdr = () => { const r = Number(process.env.USD_IDR_RATE); return Number.isFinite(r) && r > 1000 ? r : 18500; };
const SOCIAL_PLATFORMS = ["x", "tiktok", "instagram", "facebook", "youtube", "threads"];

// Accounts the team and automated tests made, so the panel can hide them from the client counts (display only).
const TEST_EMAIL = /(@narriv\.(test|ai)$|@example\.(com|org)$|@resend\.dev$|@qatestcorp\.com$|playwright|audit-test|^qa[.\-_+]|[.\-_+]qa@|tester)/i;
const TEST_NAME = /\b(test|tester|qa|playwright|audit)\b/i;

router.get("/me", async (req, res, next) => {
    try {
        res.json({ isAdmin: await isPlatformAdmin(req.user?.id) });
    } catch (err) {
        next(err);
    }
});

/** Count rows per workspace from a list of { workspace_id }. */
const countBy = (rows) => (rows || []).reduce((m, r) => m.set(r.workspace_id, (m.get(r.workspace_id) || 0) + 1), new Map());

router.get("/workspaces", requirePlatformAdmin, async (req, res) => {
    try {
        const now = Date.now();
        const since30 = new Date(now - 30 * DAY_MS).toISOString();
        const monthStart = new Date(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), 1)).toISOString();

        const { data: workspaces, error } = await db.from("workspaces").select("id, name, created_at, settings").order("created_at", { ascending: false }).limit(500);
        if (error) throw error;
        const ids = (workspaces || []).map((w) => w.id);
        if (!ids.length) return res.json({ data: [], totals: {}, socialCapUsd: totalCapUsd(), usdToIdr: usdToIdr() });

        // The numbers are independent, so they are fetched together.
        const [members, keywords, signals, alerts, tokens, social] = await Promise.all([
            db.from("workspace_members").select("workspace_id, user_id, role").in("workspace_id", ids).limit(5000),
            db.from("monitoring_keywords").select("workspace_id").in("workspace_id", ids).eq("is_active", true).limit(5000),
            db.from("signals").select("workspace_id, captured_at").in("workspace_id", ids).gte("captured_at", since30).limit(50000),
            db.from("alerts").select("workspace_id").in("workspace_id", ids).neq("status", "resolved").limit(10000),
            db.from("token_usage").select("workspace_id, model, input_tokens, output_tokens").in("workspace_id", ids).gte("created_at", monthStart).limit(50000),
            db.from("cron_ingestion_logs").select("status, metadata").eq("job_name", COLLECTION_JOB_NAME).gte("created_at", monthStart).limit(5000),
        ]);

        const ownerIds = [...new Set((members.data || []).filter((m) => m.role === "owner").map((m) => m.user_id))];
        const { data: owners } = ownerIds.length ? await db.from("users").select("id, name, email").in("id", ownerIds) : { data: [] };
        const userById = new Map((owners || []).map((u) => [u.id, u]));

        const memberCount = countBy(members.data);
        const keywordCount = countBy(keywords.data);
        const signalCount = countBy(signals.data);
        const openAlerts = countBy(alerts.data);
        const lastSignal = new Map();
        for (const s of signals.data || []) if (!lastSignal.has(s.workspace_id) || s.captured_at > lastSignal.get(s.workspace_id)) lastSignal.set(s.workspace_id, s.captured_at);
        const aiCost = new Map();
        // token_usage.cost is numeric(10,2), which rounds a single call (fractions of a cent) to 0, so the cost is
        // worked out from the tokens with the same price table that records it.
        for (const t of tokens.data || []) aiCost.set(t.workspace_id, (aiCost.get(t.workspace_id) || 0) + calculateCost(t.model || "gpt-4o-mini", Number(t.input_tokens || 0), Number(t.output_tokens || 0)));
        const socialSpend = new Map();
        for (const r of social.data || []) {
            const ws = r.metadata?.workspaceId;
            if (ws) socialSpend.set(ws, (socialSpend.get(ws) || 0) + runSpend(r));
        }

        const data = (workspaces || []).map((w) => {
            const settings = w.settings || {};
            const owner = (members.data || []).find((m) => m.workspace_id === w.id && m.role === "owner");
            const ownerUser = owner ? userById.get(owner.user_id) : null;
            const cfg = socialConfig(settings);
            return {
                id: w.id,
                name: w.name,
                createdAt: w.created_at,
                isDemo: w.id === DEMO_WORKSPACE_ID,
                isTest: TEST_EMAIL.test(ownerUser?.email || "") || TEST_NAME.test(w.name || ""),
                owner: ownerUser ? { name: ownerUser.name, email: ownerUser.email } : null,
                ...planStatus(settings, now),
                monitoringPaused: settings.monitoringPaused === true,
                keywordLimitOverride: Number.isInteger(settings.keywordLimit) ? settings.keywordLimit : null,
                billing: { status: settings.billing?.status || "none", nextInvoiceAt: settings.billing?.nextInvoiceAt || null, note: settings.billing?.note || "" },
                social: { enabled: cfg.enabled, platforms: cfg.platforms, monthlyCapUsd: cfg.monthlyCapUsd, crisisMode: cfg.crisisMode, spendUsd: Number((socialSpend.get(w.id) || 0).toFixed(2)) },
                members: memberCount.get(w.id) || 0,
                keywords: keywordCount.get(w.id) || 0,
                signals30d: signalCount.get(w.id) || 0,
                lastSignalAt: lastSignal.get(w.id) || null,
                openAlerts: openAlerts.get(w.id) || 0,
                aiCostMonth: Number((aiCost.get(w.id) || 0).toFixed(4)),
            };
        });

        const real = data.filter((w) => !w.isDemo);
        const totals = {
            workspaces: real.length,
            trials: real.filter((w) => w.plan === "trial" && !w.trialExpired).length,
            endingSoon: real.filter((w) => w.plan === "trial" && !w.trialExpired && (w.trialDaysLeft ?? 99) <= 3).length,
            expired: real.filter((w) => w.trialExpired).length,
            paid: real.filter((w) => ["pilot", "intelligence", "decision", "command"].includes(w.plan)).length,
            socialOn: real.filter((w) => w.social.enabled).length,
            aiCostMonth: Number(real.reduce((n, w) => n + w.aiCostMonth, 0).toFixed(4)),
            socialSpendMonth: Number(real.reduce((n, w) => n + w.social.spendUsd, 0).toFixed(2)),
        };
        res.json({ data, totals, socialCapUsd: totalCapUsd(), usdToIdr: usdToIdr(), generatedAt: new Date(now).toISOString() });
    } catch (error) {
        logStructured("error", "admin_workspaces_failed", { error: error?.message || error });
        res.status(500).json({ error: "Could not load workspaces." });
    }
});

const patchBody = z.object({
    plan: z.enum(PLAN_KEYS).optional(),
    trialEndsAt: z.string().datetime({ offset: true }).nullable().optional(),
    monitoringPaused: z.boolean().optional(),
    // null returns to the plan's own limit.
    keywordLimit: z.number().int().min(1).max(50).nullable().optional(),
    billing: z.object({
        status: z.enum(["none", "paid", "due", "overdue"]).optional(),
        nextInvoiceAt: z.string().datetime({ offset: true }).nullable().optional(),
        note: z.string().max(300).optional(),
    }).optional(),
    social: z.object({
        enabled: z.boolean().optional(),
        platforms: z.array(z.enum(SOCIAL_PLATFORMS)).min(1).optional(),
        monthlyCapUsd: z.number().min(0).max(500).optional(),
        crisisMode: z.boolean().optional(),
    }).optional(),
}).refine((b) => Object.keys(b).length > 0, { message: "Nothing to change." });

router.patch("/workspaces/:id", requirePlatformAdmin, validateRequest({ params: z.object({ id: z.string().uuid() }), body: patchBody }), async (req, res) => {
    try {
        const { id } = req.params;
        if (id === DEMO_WORKSPACE_ID) return res.status(400).json({ error: "The demo workspace cannot be changed here.", code: "DEMO_WORKSPACE" });
        const { data: ws, error } = await db.from("workspaces").select("id, name, settings").eq("id", id).maybeSingle();
        if (error) throw error;
        if (!ws) return res.status(404).json({ error: "Workspace not found." });

        const before = ws.settings || {};
        const settings = { ...before };
        const body = req.body;
        if (body.plan !== undefined) {
            settings.plan = body.plan;
            // A paid plan has no trial end; going (back) to trial keeps the end given, or starts 14 days from now.
            if (body.plan !== "trial") delete settings.trialEndsAt;
            else if (!settings.trialEndsAt && body.trialEndsAt === undefined) settings.trialEndsAt = new Date(Date.now() + 14 * DAY_MS).toISOString();
        }
        if (body.trialEndsAt !== undefined) {
            if (body.trialEndsAt === null) delete settings.trialEndsAt;
            else { settings.trialEndsAt = new Date(body.trialEndsAt).toISOString(); settings.plan = "trial"; }
        }
        if (body.monitoringPaused !== undefined) settings.monitoringPaused = body.monitoringPaused;
        if (body.keywordLimit !== undefined) {
            if (body.keywordLimit === null) delete settings.keywordLimit;
            else settings.keywordLimit = body.keywordLimit;
        }
        if (body.billing) {
            const b = { ...(settings.billing || {}) };
            if (body.billing.status !== undefined) b.status = body.billing.status;
            if (body.billing.nextInvoiceAt !== undefined) b.nextInvoiceAt = body.billing.nextInvoiceAt ? new Date(body.billing.nextInvoiceAt).toISOString() : null;
            if (body.billing.note !== undefined) b.note = body.billing.note.trim();
            settings.billing = b;
        }
        if (body.social) {
            if (body.social.enabled !== undefined) settings.socialAuto = body.social.enabled;
            const cfg = { ...(settings.socialConfig || {}) };
            if (body.social.platforms) cfg.platforms = body.social.platforms.filter((p) => PLATFORM_PRESET[p]);
            if (body.social.monthlyCapUsd !== undefined) cfg.monthlyCapUsd = body.social.monthlyCapUsd;
            if (body.social.crisisMode !== undefined) cfg.crisisMode = body.social.crisisMode;
            settings.socialConfig = cfg;
        }

        const { error: upErr } = await db.from("workspaces").update({ settings, updated_at: new Date().toISOString() }).eq("id", id);
        if (upErr) throw upErr;
        await recordAuditLog({
            userId: req.user.id,
            workspaceId: id,
            event: "platform_admin_workspace_updated",
            metadata: {
                changes: body,
                before: { plan: before.plan ?? null, trialEndsAt: before.trialEndsAt ?? null, monitoringPaused: before.monitoringPaused === true, socialAuto: before.socialAuto === true },
            },
        });
        const cfg = socialConfig(settings);
        res.json({ id, ...planStatus(settings), monitoringPaused: settings.monitoringPaused === true, social: { enabled: cfg.enabled, platforms: cfg.platforms, monthlyCapUsd: cfg.monthlyCapUsd, crisisMode: cfg.crisisMode } });
    } catch (error) {
        logStructured("error", "admin_workspace_update_failed", { error: error?.message || error });
        res.status(500).json({ error: "Could not save the change." });
    }
});

export default router;
