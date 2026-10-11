/**
 * Scheduler health for scheduled RSS ingestion, derived from
 * cron_ingestion_logs rows (job_name = scheduled-rss-ingestion).
 *
 * Distinguishes scheduler-initiated runs (trigger "vercel-cron:<slot>") from
 * manual runs, and flags expected UTC slots in the last 24h with no
 * scheduler run. Vercel Hobby cron may fire any time within the scheduled
 * hour, so a slot only counts as missed once its grace window has passed.
 */

export const INGEST_SLOTS_UTC = [0, 6, 12, 18];
export const SLOT_GRACE_MINUTES = 75;

const isScheduled = (trigger) => typeof trigger === "string" && trigger.startsWith("vercel-cron");

/** Classify the caller of the ingest endpoint without trusting the slot param alone. */
export function ingestTrigger({ userAgent, slot }) {
    const fromScheduler = String(userAgent || "").toLowerCase().startsWith("vercel-cron");
    if (fromScheduler) return `vercel-cron:${slot ?? "unknown"}`;
    return slot != null ? `manual:${slot}` : "manual";
}

export function schedulerHealth(runRows, now = Date.now(), { slots = INGEST_SLOTS_UTC, graceMinutes = SLOT_GRACE_MINUTES } = {}) {
    const runs = (runRows || []).map((r) => ({
        at: r.created_at,
        status: r.status,
        trigger: r.metadata?.trigger ?? null,
        durationMs: typeof r.metadata?.durationMs === "number" ? r.metadata.durationMs : null,
        keywords: typeof r.metadata?.keywords === "number" ? r.metadata.keywords : null,
    }));
    const scheduled = runs.filter((r) => isScheduled(r.trigger));
    const graceMs = graceMinutes * 60 * 1000;

    // Expected slot start times in the last 24h whose grace window has fully elapsed.
    const expected = [];
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    for (let d = -1; d <= 0; d++) {
        for (const h of slots) {
            const t = dayStart.getTime() + d * 86400000 + h * 3600000;
            if (t > now - 86400000 && t + graceMs <= now) expected.push(t);
        }
    }
    const missedSlots = expected
        .filter((t) => !scheduled.some((r) => {
            const at = new Date(r.at).getTime();
            return at >= t && at < t + graceMs;
        }))
        .map((t) => new Date(t).toISOString());

    return {
        slotsUtc: slots.map((h) => `${String(h).padStart(2, "0")}:00`),
        lastScheduledRunAt: scheduled[0]?.at ?? null,
        lastScheduledRunStatus: scheduled[0]?.status ?? null,
        lastManualRunAt: runs.find((r) => r.trigger && !isScheduled(r.trigger))?.at ?? null,
        expectedSlotsLast24h: expected.length,
        missedSlotsLast24h: missedSlots,
        recentRuns: runs.slice(0, 8),
        basis: `cron_ingestion_logs rows; a slot counts as run when a vercel-cron run started within ${graceMinutes} min of it`,
    };
}
