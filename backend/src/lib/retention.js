/**
 * Data kept per plan (lib/entitlements.js LIMITS): Starter 30 days, Pilot 90, Intelligence and Decision 365, Command
 * by contract (not removed). A trial keeps Intelligence's 365; workspaces without a plan (demos, before plans) and the
 * Narriv team's own workspaces are never trimmed.
 *
 * Records past the plan's window stay for a grace period first (RETENTION_GRACE_DAYS, 30 by default), so a client who
 * upgrades right after the window still has their history. Only after the grace period are they removed, by the daily
 * cron, in bounded batches:
 *   mentions (signals) older than the cutoff, their links to issues, their analyses, and the raw documents behind them.
 * Issues, alerts, reports and action plans are kept: they are the client's record of what happened.
 *
 * settings.retentionDays overrides the plan (a number of days, or 0 for "never remove").
 */
import { baseSupabaseAdmin as db } from "./supabase.js";
import { LIMITS, effectivePlan } from "./entitlements.js";
import { logStructured } from "./logger.js";
import { recordAuditLog } from "./audit.js";

const DAY = 86400000;
export const graceDays = () => {
    const n = Number(process.env.RETENTION_GRACE_DAYS);
    return Number.isFinite(n) && n >= 0 ? n : 30;
};

/** Days of data this workspace keeps, or null for "never remove". */
export function retentionDays(settings = {}) {
    const o = settings?.retentionDays;
    if (o === 0) return null;
    if (Number.isInteger(o) && o > 0) return o;
    if (!settings?.plan || settings?.internal === true) return null;
    return LIMITS[effectivePlan(settings)]?.retentionDays ?? null;
}

/** The date before which this workspace's mentions are removed now (window + grace), or null. */
export function removalCutoff(settings = {}, now = Date.now()) {
    const days = retentionDays(settings);
    return days ? new Date(now - (days + graceDays()) * DAY).toISOString() : null;
}

const BATCH = 500;

/** Remove one workspace's expired mentions, at most `maxRows` per run. `dryRun` only counts. */
export async function trimWorkspace(workspaceId, settings, { now = Date.now(), maxRows = 5000, dryRun = false } = {}) {
    const cutoff = removalCutoff(settings, now);
    if (!cutoff) return { workspaceId, skipped: "kept" };
    if (dryRun) {
        const { count } = await db.from("signals").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).lt("captured_at", cutoff);
        return { workspaceId, cutoff, wouldRemove: count || 0 };
    }
    let removed = 0;
    while (removed < maxRows) {
        const { data: rows, error } = await db.from("signals").select("id, raw_document_id").eq("workspace_id", workspaceId).lt("captured_at", cutoff).limit(Math.min(BATCH, maxRows - removed));
        if (error) throw error;
        if (!rows?.length) break;
        const ids = rows.map((r) => r.id);
        const rawIds = rows.map((r) => r.raw_document_id).filter(Boolean);
        // Dependents first, in case a table has no cascade.
        await db.from("narrative_cluster_signals").delete().in("signal_id", ids);
        await db.from("signal_analyses").delete().in("signal_id", ids).then(() => null, () => null);
        const { error: delErr } = await db.from("signals").delete().in("id", ids);
        if (delErr) throw delErr;
        if (rawIds.length) await db.from("raw_documents").delete().in("id", rawIds).then(() => null, () => null);
        removed += ids.length;
        if (rows.length < BATCH) break;
    }
    if (removed) await recordAuditLog({ userId: null, workspaceId, event: "retention_removed_mentions", metadata: { removed, cutoff, plan: settings?.plan } }).catch(() => null);
    return { workspaceId, cutoff, removed };
}

/** Daily: every workspace whose plan has a window. */
export async function runRetention({ now = Date.now(), dryRun = false } = {}) {
    const { data: workspaces, error } = await db.from("workspaces").select("id, settings").limit(1000);
    if (error) throw error;
    const results = [];
    for (const w of workspaces || []) {
        if (!removalCutoff(w.settings || {}, now)) continue;
        try {
            results.push(await trimWorkspace(w.id, w.settings || {}, { now, dryRun }));
        } catch (err) {
            logStructured("warn", "retention_workspace_failed", { workspaceId: w.id, error: err?.message || err });
            results.push({ workspaceId: w.id, error: err?.message || String(err) });
        }
    }
    const removed = results.reduce((n, r) => n + (r.removed || 0), 0);
    logStructured("info", "retention_run_done", { workspaces: results.length, removed, dryRun });
    return { workspaces: results.length, removed, results };
}
