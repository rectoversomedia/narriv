/**
 * Scheduled social-media collection (X, TikTok, Instagram through Apify), for the workspaces the Narriv team turned it
 * on for (workspaces.settings.socialAuto === true; scripts/social-auto.mjs). Clients cannot switch it on themselves.
 *
 * Runs from an hourly cron (:30). Each tick:
 *   1. finishes collections that are done (stores their posts, analysis, alerts);
 *   2. starts what is due: one daily round per platform (08:00 WIB), and every hour while the free sources show
 *      trouble (an open critical or high alert from the last 72 hours: "crisis mode");
 *   3. stays inside the plan's monthly quota of runs (one run = one platform once, at most $0.25), keeping enough of
 *      it for the daily rounds until the month ends, and inside the dollar caps. A run without a final bill yet
 *      counts at its full per-run cap, so the caps hold even before Apify reports the cost.
 *
 * Who gets it (lib/entitlements.js plans): Intelligence 3 platforms / 180 runs, Decision 4 / 400, Command 6 / 900.
 * Starter, Pilot and trials only with the Social Media Lite add-on the team switches on (socialAuto): 2 / 90.
 * Extra runs bought for this month: settings.socialExtra = { month: "YYYY-MM", runs }.
 */

import { baseSupabaseAdmin } from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";
import { COLLECTION_JOB_NAME, isCollectionConfigured, startCollection, syncPendingCollections } from "./apify-collection.service.js";
import { monitoringStopped } from "../../lib/workspace-plan.js";

export const SOCIAL_PRESETS = ["twitter-x-latest", "tiktok-hashtag", "instagram-posts"];
export const PLATFORM_PRESET = { x: "twitter-x-latest", tiktok: "tiktok-hashtag", instagram: "instagram-posts", youtube: "youtube-search", facebook: "facebook-posts", threads: "threads-search" };

/**
 * One workspace's settings, all set by the Narriv team (scripts/social-auto.mjs):
 *   settings.socialAuto   true / false            on or off
 *   settings.socialConfig { platforms, monthlyCapUsd, crisisMode }
 * Missing fields fall back to X + TikTok + Instagram, the env per-workspace cap, crisis mode on.
 */
/** Platforms and monthly runs per plan; "lite" is the add-on for Starter, Pilot and trials. */
export const SOCIAL_PLANS = {
    intelligence: { platforms: 3, runs: 180 },
    decision: { platforms: 4, runs: 400 },
    command: { platforms: 6, runs: 900 },
    lite: { platforms: 2, runs: 90 },
};
const PLATFORM_ORDER = ["x", "tiktok", "instagram", "facebook", "youtube", "threads"];

export function socialPlanOf(settings = {}) {
    const plan = settings?.plan;
    if (SOCIAL_PLANS[plan]) return plan;
    // Workspaces from before plans keep what the team set (switch on = the Decision allowance).
    if (!plan) return settings?.socialAuto === true ? "decision" : null;
    return settings?.socialAuto === true ? "lite" : null; // starter, pilot, trial: add-on only
}

export function extraRunsThisMonth(settings = {}, now = Date.now()) {
    const e = settings?.socialExtra;
    return e && e.month === new Date(now).toISOString().slice(0, 7) ? Math.max(0, Number(e.runs) || 0) : 0;
}

export function socialConfig(settings = {}, now = Date.now()) {
    const c = settings?.socialConfig || {};
    const tier = socialPlanOf(settings);
    const allow = tier ? SOCIAL_PLANS[tier] : { platforms: 0, runs: 0 };
    const chosen = (Array.isArray(c.platforms) && c.platforms.length ? c.platforms : PLATFORM_ORDER).filter((p) => PLATFORM_PRESET[p]);
    const platforms = chosen.slice(0, allow.platforms || chosen.length);
    const cap = Number(c.monthlyCapUsd);
    const quota = Number.isInteger(c.monthlyRuns) && c.monthlyRuns >= 0 ? c.monthlyRuns : allow.runs;
    return {
        // Paid plans from Intelligence include it; below that the team switches the add-on on. Paused by the team = off.
        enabled: Boolean(tier) && settings?.socialPaused !== true,
        tier,
        platforms,
        presets: platforms.map((p) => PLATFORM_PRESET[p]),
        monthlyRuns: quota + extraRunsThisMonth(settings, now),
        monthlyCapUsd: Number.isFinite(cap) && cap >= 0 ? Math.min(cap, totalCapUsd()) : workspaceCapUsd(),
        crisisMode: c.crisisMode !== false,
    };
}

/** Emergency stop for every workspace at once (env SOCIAL_AUTO_PAUSED=1). */
export const globallyPaused = () => ["1", "true", "yes"].includes(String(process.env.SOCIAL_AUTO_PAUSED || "").toLowerCase());
// Normal: one daily round at 08:00 WIB. Crisis: every hourly tick (the cron runs at :30 each hour).
export const ROUND_HOURS_UTC = { normal: [1], crisis: Array.from({ length: 24 }, (_, h) => h) };
const CRISIS_WINDOW_MS = 72 * 3600 * 1000;

export const workspaceCapUsd = () => Number(process.env.SOCIAL_MONTHLY_CAP_PER_WORKSPACE_USD || 250);
export const totalCapUsd = () => Number(process.env.SOCIAL_MONTHLY_CAP_TOTAL_USD || 2000);
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

/** Days left in the month after today (UTC). */
const daysLeftAfterToday = (now) => {
    const d = new Date(now);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate() - d.getUTCDate();
};

/**
 * Pure planning: which presets to start for one workspace this tick.
 * quota/runsUsed: the month's runs; in a crisis the extra hourly rounds only use runs beyond what the daily round
 * needs for the rest of the month, so a crisis early in the month cannot leave the last weeks without data.
 */
export function planWorkspace({ now, crisis, todayScheduledRuns, monthSpendUsd, totalSpendUsd, presets = SOCIAL_PRESETS, capUsd = workspaceCapUsd(), quota = Infinity, runsUsed = 0 }) {
    if (monthSpendUsd >= capUsd || totalSpendUsd >= totalCapUsd()) return { start: [], reason: "cap_reached" };
    if (runsUsed >= quota) return { start: [], reason: "quota_reached" };
    const reserve = presets.length * daysLeftAfterToday(now);
    const start = [];
    let budget = Math.min(capUsd - monthSpendUsd, totalCapUsd() - totalSpendUsd);
    let runsLeft = quota - runsUsed;
    for (const preset of presets) {
        const done = todayScheduledRuns.filter((r) => r.metadata?.preset === preset).length;
        const dailyDue = done < roundsDue(now, false);
        const crisisDue = crisis && done < roundsDue(now, true) && runsLeft - 1 >= reserve;
        if ((dailyDue || crisisDue) && runsLeft >= 1 && budget >= perRunCapUsd()) {
            start.push(preset);
            budget -= perRunCapUsd();
            runsLeft -= 1;
        }
    }
    return { start, reason: start.length ? (crisis ? "crisis" : "due") : "up_to_date" };
}

/** A run that counts against the quota: anything that reached Apify. */
export const countsAsRun = (r) => !(["failed", "skipped_overlap"].includes(r?.status) && !r?.metadata?.apifyRunId);

export async function socialStatus(workspaceId, now = Date.now()) {
    const { data: ws } = await baseSupabaseAdmin.from("workspaces").select("id, settings").eq("id", workspaceId).maybeSingle();
    const cfg = socialConfig(ws?.settings);
    const enabled = cfg.enabled && !globallyPaused();
    const monthStart = new Date(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), 1)).toISOString();
    const { data: rows } = await baseSupabaseAdmin.from("cron_ingestion_logs").select("status, created_at, metadata").eq("job_name", COLLECTION_JOB_NAME).gte("created_at", monthStart).limit(2000);
    const mine = (rows || []).filter((r) => r.metadata?.workspaceId === workspaceId);
    const crisis = enabled && cfg.crisisMode ? await inCrisis(workspaceId, now) : false;
    const lastScheduled = mine.filter((r) => r.metadata?.scheduled).map((r) => r.created_at).sort().at(-1) || null;
    return { enabled, crisis, crisisMode: cfg.crisisMode, tier: cfg.tier, platforms: cfg.platforms, roundsPerDay: (crisis ? ROUND_HOURS_UTC.crisis : ROUND_HOURS_UTC.normal).length, runsUsed: mine.filter(countsAsRun).length, monthlyRuns: cfg.monthlyRuns, monthSpendUsd: Math.round(mine.reduce((n, r) => n + runSpend(r), 0) * 100) / 100, monthCapUsd: cfg.monthlyCapUsd, lastScheduledAt: lastScheduled };
}

async function inCrisis(workspaceId, now) {
    const { count } = await baseSupabaseAdmin
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .in("severity", ["critical", "high"])
        .neq("status", "resolved")
        .gte("created_at", new Date(now - CRISIS_WINDOW_MS).toISOString());
    return (count || 0) > 0;
}

export async function runSocialSchedule({ now = Date.now(), start = startCollection, sync = syncPendingCollections } = {}) {
    const summary = { synced: null, workspaces: 0, started: [], skipped: [], configured: isCollectionConfigured() };
    // 1. Finish what is done, whatever started it.
    summary.synced = await sync({ deadline: Date.now() + 60000 }).catch((err) => ({ error: err?.message }));
    if (!summary.configured || globallyPaused()) return { ...summary, paused: globallyPaused() };

    // 2. Workspaces the Narriv team enabled, not paused by their owner and not past the end of a trial.
    const { data: workspaces, error } = await baseSupabaseAdmin.from("workspaces").select("id, settings").limit(1000);
    if (error) return { ...summary, error: error.message };
    const enabled = (workspaces || []).filter((w) => socialConfig(w.settings).enabled && !monitoringStopped(w.settings, now));
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
            quota: cfg.monthlyRuns,
            runsUsed: mine.filter(countsAsRun).length,
        });
        if (!plan.start.length) { if (plan.reason === "cap_reached" || plan.reason === "quota_reached") summary.skipped.push({ workspaceId: ws.id, reason: plan.reason }); continue; }
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
