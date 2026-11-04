#!/usr/bin/env node
/**
 * Narriv team control for scheduled social collection (X, TikTok, Instagram via Apify). Clients cannot change this.
 *
 *   node --env-file=.env scripts/social-auto.mjs status                 every workspace that is on, with this month's spend
 *   node --env-file=.env scripts/social-auto.mjs list [--all]           workspaces with active keywords (find the one to switch on)
 *   node --env-file=.env scripts/social-auto.mjs on  <workspace> [--platforms x,tiktok,instagram] [--cap 25] [--no-crisis]
 *   node --env-file=.env scripts/social-auto.mjs set <workspace> [--platforms ...] [--cap ...] [--crisis | --no-crisis]
 *   node --env-file=.env scripts/social-auto.mjs off <workspace>
 *
 * <workspace> is the workspace id or (part of) its name. Spend counts a run without a bill yet at its full cap.
 * Global limits live in the backend env on Vercel: SOCIAL_MONTHLY_CAP_TOTAL_USD (all clients, default 75),
 * SOCIAL_MONTHLY_CAP_PER_WORKSPACE_USD (default per client, 25) and SOCIAL_AUTO_PAUSED=1 (emergency stop).
 */

import { createClient } from "@supabase/supabase-js";
import { PLATFORM_PRESET, runSpend, socialConfig, totalCapUsd } from "../src/modules/ingestion/social-schedule.service.js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
    console.error("Run with the backend env: node --env-file=.env scripts/social-auto.mjs …");
    process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const [command, target, ...rest] = process.argv.slice(2);
const flag = (name) => {
    const i = rest.indexOf(`--${name}`);
    return i >= 0 ? rest[i + 1] : undefined;
};
const has = (name) => rest.includes(`--${name}`);
const usd = (n) => `$${n.toFixed(2)}`;

async function workspaces() {
    const { data, error } = await db.from("workspaces").select("id, name, settings").order("created_at", { ascending: true }).limit(2000);
    if (error) throw error;
    return data || [];
}

async function findWorkspace(q) {
    if (!q) throw new Error("Name the workspace (id or part of its name).");
    const all = await workspaces();
    const exact = all.find((w) => w.id === q);
    if (exact) return exact;
    const hits = all.filter((w) => String(w.name || "").toLowerCase().includes(q.toLowerCase()));
    if (hits.length === 1) return hits[0];
    if (!hits.length) throw new Error(`No workspace matches "${q}".`);
    throw new Error(`"${q}" matches ${hits.length} workspaces; use the id:\n${hits.map((w) => `  ${w.id}  ${w.name}`).join("\n")}`);
}

async function monthSpend() {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const { data } = await db.from("cron_ingestion_logs").select("status, metadata").eq("job_name", "apify-collection").gte("created_at", monthStart).limit(5000);
    const byWs = new Map();
    for (const r of data || []) {
        const ws = r.metadata?.workspaceId;
        if (!ws) continue;
        const cur = byWs.get(ws) || { spend: 0, runs: 0, scheduled: 0 };
        cur.spend += runSpend(r);
        cur.runs += 1;
        if (r.metadata?.scheduled) cur.scheduled += 1;
        byWs.set(ws, cur);
    }
    return byWs;
}

function parsePlatforms(value) {
    if (!value) return undefined;
    const list = value.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);
    const bad = list.filter((p) => !PLATFORM_PRESET[p]);
    if (bad.length) throw new Error(`Unknown platform: ${bad.join(", ")}. Use: ${Object.keys(PLATFORM_PRESET).join(", ")}`);
    return list;
}

async function save(ws, patch) {
    const settings = { ...(ws.settings || {}), ...patch };
    const { error } = await db.from("workspaces").update({ settings }).eq("id", ws.id);
    if (error) throw error;
    return settings;
}

function describe(ws, settings, spend) {
    const cfg = socialConfig(settings);
    const s = spend.get(ws.id) || { spend: 0, runs: 0, scheduled: 0 };
    const worst = cfg.platforms.length * 0.25 * 30;
    return [
        `${cfg.enabled ? "ON " : "off"}  ${ws.name || "(no name)"}  ${ws.id}`,
        `     platforms ${cfg.platforms.join(", ")} · cap ${usd(cfg.monthlyCapUsd)}/month · crisis mode ${cfg.crisisMode ? "on (3 rounds a day during a critical alert)" : "off"}`,
        `     this month ${usd(s.spend)} of ${usd(cfg.monthlyCapUsd)} (${s.scheduled} scheduled + ${s.runs - s.scheduled} manual runs) · normal month at most ${usd(Math.min(worst, cfg.monthlyCapUsd))}`,
    ].join("\n");
}

try {
    if (command === "list") {
        // Workspaces that monitor something (or every workspace with --all), one line each.
        const { data: kws } = await db.from("monitoring_keywords").select("workspace_id, keyword").eq("is_active", true).limit(5000);
        const byWs = new Map();
        for (const k of kws || []) byWs.set(k.workspace_id, [...(byWs.get(k.workspace_id) || []), k.keyword]);
        const all = await workspaces();
        const shown = has("all") ? all : all.filter((w) => byWs.has(w.id));
        for (const ws of shown) console.log(`${socialConfig(ws.settings).enabled ? "ON " : "off"}  ${ws.id}  ${(ws.name || "(no name)").padEnd(28)}  ${(byWs.get(ws.id) || []).slice(0, 4).join(", ")}`);
        console.log(`${shown.length} workspace(s)${has("all") ? "" : " with active keywords (--all for every workspace)"}`);
    } else if (command === "status" || !command) {
        const spend = await monthSpend();
        const on = (await workspaces()).filter((w) => socialConfig(w.settings).enabled);
        const total = [...spend.values()].reduce((n, s) => n + s.spend, 0);
        console.log(`Social collection: ${on.length} workspace(s) on · all clients this month ${usd(total)} of ${usd(totalCapUsd())} (global cap)`);
        if (["1", "true", "yes"].includes(String(process.env.SOCIAL_AUTO_PAUSED || "").toLowerCase())) console.log("Note: SOCIAL_AUTO_PAUSED is set in this env (check Vercel too).");
        for (const ws of on) console.log(describe(ws, ws.settings, spend));
    } else if (command === "on" || command === "set") {
        const ws = await findWorkspace(target);
        const cfg = socialConfig(ws.settings);
        const platforms = parsePlatforms(flag("platforms")) ?? cfg.platforms;
        const capRaw = flag("cap");
        const cap = capRaw !== undefined ? Number(capRaw) : cfg.monthlyCapUsd;
        if (!Number.isFinite(cap) || cap < 0) throw new Error("--cap must be a number of dollars, e.g. --cap 25");
        const crisisMode = has("no-crisis") ? false : has("crisis") ? true : cfg.crisisMode;
        const settings = await save(ws, {
            socialAuto: command === "on" ? true : ws.settings?.socialAuto === true,
            socialConfig: { platforms, monthlyCapUsd: cap, crisisMode },
        });
        console.log(describe(ws, settings, await monthSpend()));
    } else if (command === "off") {
        const ws = await findWorkspace(target);
        const settings = await save(ws, { socialAuto: false });
        console.log(describe(ws, settings, await monthSpend()));
    } else {
        console.log("Commands: status | list | on <workspace> [--platforms x,tiktok,instagram] [--cap 25] [--no-crisis] | set <workspace> … | off <workspace>");
        process.exit(1);
    }
} catch (err) {
    console.error(err.message || err);
    process.exit(1);
}
