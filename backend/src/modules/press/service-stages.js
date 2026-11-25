/**
 * Three more stages of an approved plan, each built like the press release: an AI-written document that an owner/admin
 * must approve, then the details (what, when, where), a quote request to the Narriv team, and the same offer →
 * invoice → delivery → impact tracking (fulfilment.js).
 *
 *   /video   short videos (Content Studio): the scripts, then how many, how long, which format, by when
 *   /ads     paid ads: the ad plan and copy, then platforms, cities, dates, budget, objective
 *   /social  social media management: the content calendar, then platforms, dates, posts per week
 *
 * GET /:kind/:planId · POST /:planId/draft · PUT /:planId · POST /:planId/review · PUT /:planId/details ·
 * POST /:planId/quote · POST /:planId/quote/decision · PUT /:planId/delivery/:itemId
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
import { canApprove, canEdit, docView, fail, guard, loadPlan, mountApprovalRoutes, notifyTeam, requester, saveDoc } from "./approval-doc.js";
import { KINDS, deliveryView, impactView, mountFulfilmentRoutes } from "./fulfilment.js";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date.");
const fmt = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const addDays = (d, n) => new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
const span = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000) + 1;

const SPECS = {
    video: {
        system: (brand, id) => [
            `You write short-video scripts for ${brand} in ${id ? "Indonesian" : "English"}, for vertical social video (TikTok, Reels, Shorts).`,
            "Write two or three distinct scripts. For each: a title line, the hook in the first two seconds, three to five scenes (what is shown, the voice-over line, the on-screen text), and the closing call to action.",
            "Facts only from the context. In a sensitive issue: calm, helpful, no defending or attacking, point people to the official help channels.",
            'Reply as JSON: {"title": string, "body": string}. Separate scripts with a blank line and a heading line "Video 1", "Video 2"…',
        ].join(" "),
        details: z.object({
            count: z.number().int().min(1).max(10),
            duration: z.enum(["15", "30", "60"]),
            aspect: z.enum(["9:16", "1:1", "16:9"]),
            due: day,
            note: z.string().trim().max(500).optional(),
        }),
        deliverables: (d) => Array.from({ length: d.count }, (_, i) => ({ id: `video-${i + 1}`, name: `Video ${i + 1}`, sub: `${d.duration} detik · ${d.aspect}`, due: d.due })),
        summary: (d) => [`${d.count} video · ${d.duration} detik · ${d.aspect}`, `Selesai: ${fmt(d.due)}`, d.note ? `Catatan: ${d.note}` : ""],
    },
    ads: {
        system: (brand, id) => [
            `You plan paid social and search ads for ${brand} in ${id ? "Indonesian" : "English"}.`,
            `Use these section headings, each on its own line followed by lines starting with "- ": ${id ? "Tujuan, Audiens, Pesan kunci, Materi iklan (3 variasi teks per platform), Ukuran keberhasilan, Yang dihindari" : "Objective, Audience, Key messages, Ad copy (3 variants per platform), Success measures, What to avoid"}.`,
            "Ad copy within platform limits (headline up to 40 characters, primary text up to 125). Facts only from the context; no invented promotions or prices.",
            "In a sensitive issue the ads inform and help (where to get help, the facts), they never argue with the critics.",
            'Reply as JSON: {"title": string, "body": string}.',
        ].join(" "),
        details: z.object({
            platforms: z.array(z.enum(["Meta", "TikTok", "Google", "YouTube"])).min(1),
            objective: z.enum(["awareness", "traffic", "leads"]),
            cities: z.array(z.string().trim().min(2).max(60)).max(20).optional().default([]),
            start: day,
            end: day,
            budget: z.number().int().min(0).max(100_000_000_000),
            note: z.string().trim().max(500).optional(),
        }).refine((d) => d.start <= d.end, { message: "The campaign ends before it starts." }),
        deliverables: (d) => d.platforms.map((p) => ({ id: `ads-${p.toLowerCase()}`, name: `${p} Ads`, sub: `${fmt(d.start)}–${fmt(d.end)}${d.cities.length ? ` · ${d.cities.slice(0, 3).join(", ")}${d.cities.length > 3 ? "…" : ""}` : ""}`, due: d.start })),
        summary: (d) => [`Platform: ${d.platforms.join(", ")} · tujuan ${d.objective}`, `Periode: ${fmt(d.start)}–${fmt(d.end)} (${span(d.start, d.end)} hari)`, `Kota: ${d.cities.length ? d.cities.join(", ") : "seluruh Indonesia"}`, `Budget iklan: Rp${d.budget.toLocaleString("id-ID")}`, d.note ? `Catatan: ${d.note}` : ""],
    },
    social: {
        system: (brand, id) => [
            `You plan the official social media content of ${brand} in ${id ? "Indonesian" : "English"}.`,
            "Write a content calendar: content pillars first, then one line per post with the week, the platform, the format and a ready caption (with hashtags).",
            "In a sensitive issue: acknowledge, inform, point to help; no defensive or promotional posts in the first week.",
            "Facts only from the context.",
            'Reply as JSON: {"title": string, "body": string}.',
        ].join(" "),
        details: z.object({
            platforms: z.array(z.enum(["Instagram", "TikTok", "X", "Facebook", "LinkedIn", "YouTube"])).min(1),
            start: day,
            end: day,
            perWeek: z.number().int().min(1).max(21),
            note: z.string().trim().max(500).optional(),
        }).refine((d) => d.start <= d.end, { message: "The calendar ends before it starts." }),
        deliverables: (d) => {
            const total = Math.min(60, Math.max(1, Math.round((span(d.start, d.end) / 7) * d.perWeek)));
            const step = span(d.start, d.end) / total;
            return Array.from({ length: total }, (_, i) => {
                const platform = d.platforms[i % d.platforms.length];
                return { id: `post-${i + 1}`, name: `Post ${i + 1} · ${platform}`, sub: platform, due: addDays(d.start, Math.floor(i * step)) };
            });
        },
        summary: (d) => [`Platform: ${d.platforms.join(", ")}`, `Periode: ${fmt(d.start)}–${fmt(d.end)} · ${d.perWeek} posting/minggu`, d.note ? `Catatan: ${d.note}` : ""],
    },
};

async function writeDoc(kind, ctx, { note = null, current = null } = {}) {
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
    const details = strategy?.[KINDS[kind].key]?.details;
    const user = [
        cluster ? `Issue: ${cluster.title}. ${cluster.summary || ""}` : plan.description ? `Context: ${plan.description}` : "",
        `Response plan: ${plan.title}. ${option.executive_summary || strategy?.executive_summary || ""}`,
        settings?.industry ? `Industry: ${settings.industry}` : "",
        list(option.key_messages).length ? `Key messages:\n- ${list(option.key_messages).slice(0, 6).join("\n- ")}` : "",
        details ? `Agreed details: ${SPECS[kind].summary(details).filter(Boolean).join("; ")}` : "",
        current ? `Current version to revise:\nTitle: ${current.title}\n\n${current.body}` : "",
        note ? `Reviewer's revision request (follow it exactly): ${note}` : "",
    ].filter(Boolean).join("\n\n");
    const result = await runAiTask({
        task: "generation", workspaceId: plan.workspace_id, json: true, system: SPECS[kind].system(brand, id), user,
        validate: (v) => v && typeof v.title === "string" && v.title.trim().length > 5 && typeof v.body === "string" && v.body.trim().length > 200,
    });
    if (!result?.ok) throw Object.assign(new Error("This could not be written. Try again."), { status: 502 });
    return { title: result.data.title.trim().slice(0, 200), body: result.data.body.trim().slice(0, 12000) };
}

export function createServiceStageRouter(kind) {
    const spec = SPECS[kind];
    const { key, label } = KINDS[kind];
    const router = express.Router();
    router.use(verifyToken);
    const view = (doc) => (doc ? { ...docView(doc), details: doc.details || null, deliverables: doc.deliverables || [] } : null);
    const active = (doc) => doc?.quote && doc.quote.status !== "declined";

    router.get("/:planId", async (req, res) => {
        try {
            const ctx = await loadPlan(req);
            if (!ctx) return res.status(404).json({ error: "Action plan not found" });
            const doc = ctx.strategy?.[key] || null;
            return res.json({
                data: view(doc),
                canEdit: canEdit(ctx.role),
                canApprove: canApprove(ctx.role),
                delivery: await deliveryView(kind, ctx.plan.workspace_id, doc).catch(() => null),
                impact: await impactView(ctx.plan.workspace_id, ctx.plan, doc).catch(() => null),
            });
        } catch (error) {
            logStructured("error", `${kind}_stage_read_failed`, { error: error?.message || error });
            return res.status(500).json({ error: "This could not be loaded." });
        }
    });

    mountApprovalRoutes(router, { key, event: `${kind}_doc`, write: (ctx, opts) => writeDoc(kind, ctx, opts), view, bodyMax: 12000 });
    mountFulfilmentRoutes(router, { kind, view });

    router.put("/:planId/details", validateRequest({ body: spec.details }), async (req, res) => {
        try {
            const ctx = await guard(req, res, "edit");
            if (!ctx) return;
            const current = ctx.strategy[key];
            if (current?.status !== "approved") return res.status(409).json({ error: "Approve the document before setting the details." });
            if (active(current)) return res.status(409).json({ error: "A quote was already requested." });
            const saved = await saveDoc(ctx, key, { ...current, details: req.body, deliverables: spec.deliverables(req.body) });
            return res.json({ data: view(saved) });
        } catch (error) {
            return fail(res, error, `${kind}_details_failed`);
        }
    });

    router.post("/:planId/quote", validateRequest({ body: z.object({ note: z.string().trim().max(1000).optional().default("") }) }), async (req, res) => {
        try {
            const ctx = await guard(req, res, "approve");
            if (!ctx) return;
            const current = ctx.strategy[key];
            if (current?.status !== "approved" || !current.details) return res.status(409).json({ error: "Approve the document and set the details first." });
            if (active(current)) return res.status(409).json({ error: "A quote was already requested." });
            const who = await requester(ctx, req);
            const text = [
                `Permintaan penawaran ${label[1].toLowerCase()} (Narriv)`,
                `Workspace: ${who.workspace}`,
                `Diminta oleh: ${who.name}${who.email ? ` (${who.email})` : ""}`,
                `Rencana aksi: ${ctx.plan.title}`,
                `Dokumen: ${current.title}`,
                ...spec.summary(current.details),
                req.body.note ? `Catatan: ${req.body.note}` : "",
            ].filter(Boolean).join("\n");
            const sent = await notifyTeam({ subject: `Permintaan penawaran ${label[1].toLowerCase()}: ${who.workspace}`, text, metadata: { planId: ctx.plan.id } });
            if (!sent) return res.status(503).json({ error: "The request could not be sent. Try again in a moment." });
            const saved = await saveDoc(ctx, key, { ...current, quote: { status: "requested", requestedAt: new Date().toISOString(), by: req.user.id, byName: who.name, note: req.body.note || null } });
            await recordAuditLog({ userId: req.user.id, workspaceId: ctx.plan.workspace_id, event: `${kind}_quote_requested`, metadata: { planId: ctx.plan.id } }).catch(() => null);
            return res.json({ data: view(saved) });
        } catch (error) {
            return fail(res, error, `${kind}_quote_failed`);
        }
    });

    return router;
}
