/**
 * A workspace's plan and trial, kept in workspaces.settings (set by the Narriv team in the admin panel):
 *   settings.plan          "trial" | "pilot" | "intelligence" | "decision" | "command"
 *   settings.trialEndsAt   ISO time the trial ends (trial only)
 *
 * New workspaces start a 14-day trial. When it runs out, scheduled monitoring (news, YouTube, social) stops for
 * that workspace until the team moves it to a paid plan or extends the trial. Workspaces created before plans
 * existed have no plan set and are never stopped by this.
 */

export const TRIAL_DAYS = 14;
export const PLAN_KEYS = ["trial", "pilot", "intelligence", "decision", "command"];
const DAY_MS = 24 * 60 * 60 * 1000;

/** Settings to merge into a new workspace: a fresh trial. */
export function newTrialSettings(now = Date.now()) {
    return { plan: "trial", trialEndsAt: new Date(now + TRIAL_DAYS * DAY_MS).toISOString() };
}

/** True when the workspace is on a trial whose end has passed. */
export function trialExpired(settings, now = Date.now()) {
    if (settings?.plan !== "trial" || !settings?.trialEndsAt) return false;
    const end = new Date(settings.trialEndsAt).getTime();
    return Number.isFinite(end) && end <= now;
}

/** Plan, trial end and whole days left (rounded up, never below 0) for display. */
export function planStatus(settings, now = Date.now()) {
    const plan = PLAN_KEYS.includes(settings?.plan) ? settings.plan : null;
    const trialEndsAt = plan === "trial" && settings?.trialEndsAt ? settings.trialEndsAt : null;
    const end = trialEndsAt ? new Date(trialEndsAt).getTime() : NaN;
    const trialDaysLeft = Number.isFinite(end) ? Math.max(0, Math.ceil((end - now) / DAY_MS)) : null;
    return { plan, trialEndsAt, trialDaysLeft, trialExpired: trialExpired(settings, now) };
}

/** True when scheduled collection should skip the workspace: paused by its owner, or its trial ran out. */
export function monitoringStopped(settings, now = Date.now()) {
    return settings?.monitoringPaused === true || trialExpired(settings, now);
}
