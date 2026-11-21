/**
 * Future Issues: the stories most likely to become the brand's next issue, read from everything the workspace has
 * (last 30 days): current issues with their risk, momentum and risk drivers, refuted claims and coordination, open
 * alerts, the platforms and tone of the conversation week over week, and recent headlines. One AI call turns that
 * into 3–6 forecasts, each tied to the evidence it came from and to the issues it grows out of, with the early
 * signs to watch and what to prepare now. Results are stored (raw_documents "future:<ts>") and reused for 12 hours.
 */
import supabase from "./supabase.js";
import { aiJson } from "./ai-json.js";
import { buildRadar } from "./narrative-radar.js";
import { workspaceLanguage } from "./workspace-language.js";
import { stripEmoji } from "../modules/actions/actions.service.js";
import { logStructured } from "./logger.js";

const DAY = 86400000;
export const FUTURE_TTL_MS = 12 * 3600000;

const toneOf = (s) => String((s.analyses || []).find((a) => a?.analysis?.sentiment)?.analysis?.sentiment || s.sentiment || "").toLowerCase();

/** The workspace's data, condensed for the forecast (no AI). */
export async function futureContext(workspaceId, { db = supabase, now = Date.now() } = {}) {
    const since30 = new Date(now - 30 * DAY).toISOString();
    const [radar, { data: settings }, { data: signals }, { data: alerts }] = await Promise.all([
        buildRadar(workspaceId, { db, now, limit: 12 }),
        db.from("workspace_settings").select("brand_name, industry").eq("workspace_id", workspaceId).maybeSingle(),
        db.from("signals").select("title, platform, sentiment, captured_at, analyses:signal_analyses(analysis)").eq("workspace_id", workspaceId).gte("captured_at", since30).order("captured_at", { ascending: false }).limit(600),
        db.from("alerts").select("title, severity, status, created_at").eq("workspace_id", workspaceId).gte("created_at", since30).order("created_at", { ascending: false }).limit(15),
    ]);
    const list = signals || [];
    const week = (from, to) => list.filter((s) => { const t = now - Date.parse(s.captured_at); return t >= from * DAY && t < to * DAY; });
    const thisWeek = week(0, 7), lastWeek = week(7, 14);
    const share = (arr, tone) => (arr.length ? Math.round((arr.filter((s) => toneOf(s) === tone).length / arr.length) * 100) : 0);
    const platforms = {};
    for (const s of thisWeek) platforms[s.platform || "lain"] = (platforms[s.platform || "lain"] || 0) + 1;
    return {
        brand: settings?.brand_name || "brand",
        industry: settings?.industry || null,
        today: new Date(now).toISOString().slice(0, 10),
        records30d: list.length,
        week: { now: thisWeek.length, before: lastWeek.length, negativeNow: share(thisWeek, "negative"), negativeBefore: share(lastWeek, "negative"), platforms },
        issues: radar.items.map((it) => ({ id: it.id, title: it.title, risk: it.score, level: it.level, momentum72h: it.momentum, last72h: it.last72h, drivers: it.factors.slice(0, 3).map((f) => f.label), finding: it.finding })),
        alerts: (alerts || []).map((a) => ({ title: a.title, severity: a.severity, status: a.status, date: String(a.created_at).slice(0, 10) })),
        headlines: list.slice(0, 40).map((s) => `${String(s.captured_at).slice(0, 10)} [${s.platform}${toneOf(s) ? `, ${toneOf(s)}` : ""}] ${String(s.title || "").slice(0, 140)}`),
    };
}

const LEVELS = ["high", "medium", "low"];
const clampPct = (n) => Math.max(5, Math.min(95, Math.round(Number(n) || 0)));

/** Keep only well-formed forecasts, tied to issues that exist; no emoji. */
export function normalizeForecasts(raw, ctx) {
    const ids = new Set(ctx.issues.map((i) => i.id));
    const titleOf = new Map(ctx.issues.map((i) => [i.id, i.title]));
    const arr = (v) => (Array.isArray(v) ? v.map((x) => stripEmoji(String(x || "")).trim()).filter(Boolean).slice(0, 4) : []);
    return (raw?.forecasts || []).map((f) => {
        const likelihood = clampPct(f.likelihood);
        const related = (Array.isArray(f.related_issue_ids) ? f.related_issue_ids : []).filter((id) => ids.has(id)).slice(0, 3);
        return {
            title: stripEmoji(String(f.title || "")).trim().slice(0, 120),
            horizon: stripEmoji(String(f.horizon || "")).trim().slice(0, 60),
            likelihood,
            impact: LEVELS.includes(f.impact) ? f.impact : "medium",
            why: stripEmoji(String(f.why || "")).trim().slice(0, 500),
            evidence: arr(f.evidence),
            earlySignals: arr(f.early_signals),
            prepare: arr(f.prepare),
            audiences: arr(f.audiences).slice(0, 3),
            related: related.map((id) => ({ id, title: titleOf.get(id) })),
        };
    }).filter((f) => f.title && f.why).sort((a, b) => b.likelihood - a.likelihood).slice(0, 6);
}

export async function generateFutureIssues(workspaceId, { db = supabase, chat, now = Date.now() } = {}) {
    const ctx = await futureContext(workspaceId, { db, now });
    if (!ctx.records30d && !ctx.issues.length) return { forecasts: [], basis: { records: 0, issues: 0, alerts: 0 }, at: new Date(now).toISOString(), empty: true };
    const lang = await workspaceLanguage(workspaceId).catch(() => "id");
    const id = lang !== "en";
    const raw = await aiJson({
        workspaceId, chat, operation: "future_issues", maxTokens: 6000,
        system: [
            `You are a senior narrative-risk analyst forecasting the next issues for ${ctx.brand}${ctx.industry ? ` (${ctx.industry})` : ""} in Indonesia.`,
            "Forecast only from the data given: every forecast must grow out of the listed issues, alerts, week-over-week figures or headlines, and cite them with their numbers.",
            "Think about how current stories escalate (to regulators, media, customers, employees), how they combine, and dated moments ahead (paydays, holidays, end of year, results seasons) that could trigger them.",
            "Prefer specific, plausible, decision-useful forecasts over generic ones. Likelihood is a calibrated percentage.",
            `Write in ${id ? "Indonesian (professional, concise, no slang)" : "English"} for a board director: plain business language, never field names or data jargon (no "momentum72h", "level high", "acknowledged", "signals"), dates written as "18 November", platforms by their names (Instagram, YouTube, berita online). No emoji, no decorative symbols, no exclamation marks.`,
        ].join(" "),
        user: `Today: ${ctx.today}\nData (last 30 days):\n${JSON.stringify(ctx)}\n\nReturn {"forecasts": [{"title": "the future issue as a headline-style phrase", "horizon": "${id ? "e.g. 1–2 minggu, bulan ini, 1–3 bulan" : "e.g. 1–2 weeks, this month, 1–3 months"}", "likelihood": 0-100, "impact": "high|medium|low", "why": "2–3 sentences: how it develops from the data, with numbers", "evidence": ["data points it rests on"], "early_signals": ["what to watch that would confirm it"], "prepare": ["concrete steps to take now"], "audiences": ["who it would hit"], "related_issue_ids": ["ids from issues"]}]} with 3 to 6 forecasts, most likely first.`,
    });
    const forecasts = normalizeForecasts(raw, ctx);
    const result = { forecasts, basis: { records: ctx.records30d, issues: ctx.issues.length, alerts: ctx.alerts.length }, at: new Date(now).toISOString() };
    if (forecasts.length) {
        const { error } = await db.from("raw_documents").insert({ workspace_id: workspaceId, external_id: `future:${now}`, title: "Future issues", metadata: { future: result } });
        if (error) logStructured("warn", "future_issues_store_failed", { error: error.message });
    }
    return result;
}

/** The latest stored forecast when still fresh, else a new one. */
export async function futureIssues(workspaceId, { db = supabase, refresh = false, now = Date.now() } = {}) {
    if (!refresh) {
        const { data } = await db.from("raw_documents").select("metadata, created_at").eq("workspace_id", workspaceId).like("external_id", "future:%").order("created_at", { ascending: false }).limit(1);
        const last = data?.[0]?.metadata?.future;
        if (last && now - Date.parse(last.at) < FUTURE_TTL_MS) return { ...last, cached: true };
    }
    return generateFutureIssues(workspaceId, { db, now });
}
