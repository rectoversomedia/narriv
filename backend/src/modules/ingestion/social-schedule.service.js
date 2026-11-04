/**
 * Scheduled social-media collection (X, TikTok, Instagram through Apify), for the workspaces the Narriv team turned it
 * on for (workspaces.settings.socialAuto === true; scripts/social-auto.mjs). Clients cannot switch it on themselves.
 *
 * Runs from an hourly cron (:30). Each tick:
 *   1. finishes collections that are done (stores their posts, analysis, alerts);
 *   2. starts today's due rounds: one round a day at 08:00 WIB, three (08:00, 12:00, 16:00 WIB) while the workspace
 *      has an open critical alert from the last 72 hours ("crisis mode");
 *   3. never spends past the monthly caps. A run without a final bill yet counts at its full per-run cap, so the
 *      caps hold even before Apify reports the cost.
 */

import { baseSupabaseAdmin } from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";
import { COLLECTION_JOB_NAME, isCollectionConfigured, startCollection, syncPendingCollections } from "./apify-collection.service.js";

export const SOCIAL_PRESETS = ["twitter-x-latest", "tiktok-hashtag", "instagram-posts"];
export const PLATFORM_PRESET = { x: "twitter-x-latest", tiktok: "tiktok-hashtag", instagram: "instagram-posts", youtube: "youtube-search", facebook: "facebook-posts", threads: "threads-search" };

/**
 * One workspace's settings, all set by the Narriv team (scripts/social-auto.mjs):
 *   settings.socialAuto   true / false            on or off
 *   settings.socialConfig { platforms, monthlyCapUsd, crisisMode }
 * Missing fields fall back to X + TikTok + Instagram, the env per-workspace cap, crisis mode on.
 */
export function socialConfig(settings = {}) {
    const c = settings?.socialConfig || {};
    const platforms = (Array.isArray(c.platforms) && c.platforms.length ? c.platforms : ["x", "tiktok", "instagram"]).filter((p) => PLATFORM_PRESET[p]);
    const cap = Number(c.monthlyCapUsd);
    return {
        enabled: settings?.socialAuto === true,
        platforms,
        presets: platforms.map((p) => PLATFORM_PRESET[p]),
        monthlyCapUsd: Number.isFinite(cap) && cap >= 0 ? Math.min(cap, totalCapUsd()) : workspaceCapUsd(),
        crisisMode: c.crisisMode !== false,
    };
}

/** Emergency stop for every workspace at once (env SOCIAL_AUTO_PAUSED=1). */
export const globallyPaused = () => ["1", "true", "yes"].includes(String(process.env.SOCIAL_AUTO_PAUSED || "").toLowerCase());
export const ROUND_HOURS_UTC = { normal: [1], crisis: [1, 5, 9] }; // 08:00 / 12:00 / 16:00 WIB
const CRISIS_WINDOW_MS = 72 * 3600 * 1000;

export const workspaceCapUsd = () => Number(process.env.SOCIAL_MONTHLY_CAP_PER_WORKSPACE_USD || 25);
export const totalCapUsd = () => Number(process.env.SOCIAL_MONTHLY_CAP_TOTAL_USD || 75);
const perRunCapUsd = () => Math.min(Number(process.env.APIFY_COLLECTION_MAX_CHARGE_USD || 0.25), Number(process.env.APIFY_MAX_CHARGE_USD || 0.5));

/** Spend of one collection row: the billed cost, or the per-run cap while it has none. */
export function runSpend(row) {
    const m = row?.metadata || {};
    if (typeof m.costUsd === "number") return m.costUsd;
    if (["failed", "skipped_overlap"].includes(row?.status) && !m.apifyRunId) return 0;
    return typeof m.maxTotalChargeUsd === "number" ? m.maxTotalChargeUsd : perRunCapUsd();
}

/** How many rounds should have started today by `now` (UTC hours). */
export function roundsDue(now, crisis) {
    const hour = new Date(now).getUTCHours();
    return (crisis ? ROUND_HOURS_UTC.crisis : ROUND_HOURS_UTC.normal).filter((h) => h <= hour).length;
}

/** Pure planning: which presets to start for one workspace this tick. */
export function planWorkspace({ now, crisis, todayScheduledRuns, monthSpendUsd, totalSpendUsd, presets = SOCIAL_PRESETS, capUsd = workspaceCapUsd() }) {
    if (monthSpendUsd >= capUsd || totalSpendUsd >= totalCapUsd()) return { start: [], reason: "cap_reached" };
    const due = roundsDue(now, crisis);
    const start = [];
    let budget = Math.min(capUsd - monthSpendUsd, totalCapUsd() - totalSpendUsd);
    for (const preset of presets) {
        const done = todayScheduledRuns.filter((r) => r.metadata?.preset === preset).length;
        if (done < due && budget >= perRunCapUsd()) {
            start.push(preset);
            budget -= perRunCapUsd();
        }
    }
    return { start, reason: start.length ? "due" : "up_to_date" };
}

export async function socialStatus(workspaceId, now = Date.now()) {
    const { data: ws } = await baseSupabaseAdmin.from("workspaces").select("id, settings").eq("id", workspaceId).maybeSingle();
    const cfg = socialConfig(ws?.settings);
    const enabled = cfg.enabled && !globallyPaused();
    const monthStart = new Date(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), 1)).toISOString();
    const { data: rows } = await baseSupabaseAdmin.from("cron_ingestion_logs").select("status, created_at, metadata").eq("job_name", COLLECTION_JOB_NAME).gte("created_at", monthStart).limit(2000);
    const mine = (rows || []).filter((r) => r.metadata?.workspaceId === workspaceId);
    const crisis = enabled && cfg.crisisMode ? await inCrisis(workspaceId, now) : false;
    const lastScheduled = mine.filter((r) => r.metadata?.scheduled).map((r) => r.created_at).sort().at(-1) || null;
    return { enabled, crisis, crisisMode: cfg.crisisMode, platforms: cfg.platforms, roundsPerDay: crisis ? 3 : 1, monthSpendUsd: Math.round(mine.reduce((n, r) => n + runSpend(r), 0) * 100) / 100, monthCapUsd: cfg.monthlyCapUsd, lastScheduledAt: lastScheduled };
}

async function inCrisis(workspaceId, now) {
    const { count } = await baseSupabaseAdmin
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("severity", "critical")
        .neq("status", "resolved")
        .gte("created_at", new Date(now - CRISIS_WINDOW_MS).toISOString());
    return (count || 0) > 0;
}

export async function runSocialSchedule({ now = Date.now(), start = startCollection, sync = syncPendingCollections } = {}) {
    const summary = { synced: null, workspaces: 0, started: [], skipped: [], configured: isCollectionConfigured() };
    // 1. Finish what is done, whatever started it.
    summary.synced = await sync({ deadline: Date.now() + 60000 }).catch((err) => ({ error: err?.message }));
    if (!summary.configured || globallyPaused()) return { ...summary, paused: globallyPaused() };

    // 2. Workspaces the Narriv team enabled, not paused by their owner.
    const { data: workspaces, error } = await baseSupabaseAdmin.from("workspaces").select("id, settings").limit(1000);
    if (error) return { ...summary, error: error.message };
    const enabled = (workspaces || []).filter((w) => socialConfig(w.settings).enabled && w.settings?.monitoringPaused !== true);
    summary.workspaces = enabled.length;
    if (!enabled.length) return summary;

    const monthStart = new Date(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), 1)).toISOString();
    const dayStart = new Date(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate())).toISOString();
    const { data: rows } = await baseSupabaseAdmin.from("cron_ingestion_logs").select("status, created_at, metadata").eq("job_name", COLLECTION_JOB_NAME).gte("created_at", monthStart).limit(5000);
    let totalSpend = (rows || []).reduce((n, r) => n + runSpend(r), 0);

    for (const ws of enabled) {
        const mine = (rows || []).filter((r) => r.metadata?.workspaceId === ws.id);
        const cfg = socialConfig(ws.settings);
        const crisis = cfg.crisisMode ? await inCrisis(ws.id, now) : false;
        const plan = planWorkspace({
            presets: cfg.presets,
            capUsd: cfg.monthlyCapUsd,
            now,
            crisis,
            todayScheduledRuns: mine.filter((r) => r.metadata?.scheduled && r.created_at >= dayStart && r.status !== "skipped_overlap"),
            monthSpendUsd: mine.reduce((n, r) => n + runSpend(r), 0),
            totalSpendUsd: totalSpend,
        });
        if (!plan.start.length) { if (plan.reason === "cap_reached") summary.skipped.push({ workspaceId: ws.id, reason: plan.reason }); continue; }
        for (const presetKey of plan.start) {
            try {
                await start({ workspaceId: ws.id, presetKey, scheduled: true, userId: null });
                totalSpend += perRunCapUsd();
                summary.started.push({ workspaceId: ws.id, presetKey, crisis });
            } catch (err) {
                summary.skipped.push({ workspaceId: ws.id, presetKey, reason: err?.code || err?.message });
            }
        }
    }
    logStructured("info", "social_schedule_tick", { workspaces: summary.workspaces, started: summary.started.length, skipped: summary.skipped.length });
    return summary;
}
