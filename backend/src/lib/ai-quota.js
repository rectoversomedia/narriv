/**
 * AI calls per workspace per month, by plan. Every AI call made for a workspace (the AI gateway, the analysis of
 * collected records) runs inside runWithAiWorkspace(id, fn); the chat client then checks this quota before calling
 * a model. Past the quota, AI stops for that workspace until next month: records are still stored, without a
 * sentiment, and the daily backfill finishes them later. The platform-wide cap (chat-client.js) still applies.
 *
 * Override per workspace: settings.aiCallLimit (a number). Counted from token_usage, cached for ten minutes.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { logStructured } from "./logger.js";
import { selectedWorkspaceId } from "./request-context.js";

export const AI_CALLS_PER_MONTH = { trial: 3000, starter: 1000, pilot: 1500, intelligence: 5000, decision: 15000, command: 40000 };
const NO_PLAN = 40000; // demos and workspaces from before plans

const als = new AsyncLocalStorage();
export const runWithAiWorkspace = (workspaceId, fn) => (workspaceId ? als.run({ workspaceId }, fn) : fn());
// Inside a request, the selected workspace counts when no job set one.
export const currentAiWorkspace = () => als.getStore()?.workspaceId || selectedWorkspaceId() || null;

export function aiCallLimit(settings = {}) {
    const o = Number(settings?.aiCallLimit);
    if (Number.isInteger(o) && o > 0) return o;
    return AI_CALLS_PER_MONTH[settings?.plan] ?? NO_PLAN;
}

const cache = new Map(); // workspaceId → { at, month, used, limit }
async function load(workspaceId, db) {
    const month = new Date().toISOString().slice(0, 7);
    const hit = cache.get(workspaceId);
    if (hit && hit.month === month && Date.now() - hit.at < 10 * 60 * 1000) return hit;
    const [{ count }, { data: ws }] = await Promise.all([
        db.from("token_usage").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("created_at", `${month}-01T00:00:00Z`),
        db.from("workspaces").select("settings").eq("id", workspaceId).maybeSingle(),
    ]);
    const row = { at: Date.now(), month, used: count || 0, limit: aiCallLimit(ws?.settings || {}) };
    cache.set(workspaceId, row);
    return row;
}

/** Calls used and the limit this month, for the plan page and the admin panel. */
export async function aiUsage(workspaceId, db = null) {
    db ??= (await import("./supabase.js")).default;
    cache.delete(workspaceId);
    const { used, limit } = await load(workspaceId, db);
    return { used, limit };
}

/** Throws AI_WORKSPACE_QUOTA when the current workspace has used its month. No workspace in context: no check. */
export async function assertWorkspaceQuota(deps = {}) {
    const workspaceId = deps.workspaceId ?? currentAiWorkspace();
    if (!workspaceId) return;
    let row;
    try {
        row = await load(workspaceId, deps.db || (await import("./supabase.js")).default);
    } catch {
        return; // a failed check never blocks AI
    }
    if (row.used >= row.limit) {
        logStructured("warn", "ai_workspace_quota_reached", { workspaceId, used: row.used, limit: row.limit });
        throw Object.assign(new Error(`This workspace has used its AI analysis for the month (${row.used}/${row.limit}).`), { code: "AI_WORKSPACE_QUOTA" });
    }
    row.used += 1;
}

export function forgetAiQuota(workspaceId) {
    cache.delete(workspaceId);
}
