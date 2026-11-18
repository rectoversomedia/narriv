import supabase from "./supabase.js";
import { logStructured } from "./logger.js";
import { workspaceLanguage } from "./workspace-language.js";

/**
 * Default follow-up for a risky issue, so a client does not have to click anything to get the full flow:
 *   issue (negative or mixed, 2+ records) → an action plan drafted by AI → a case for the team to investigate.
 * Positive issues become opportunities in alerts.service (detectOpportunities).
 *
 * Cost control: at most `maxPlans` AI plans per workspace per run (default 1); the rest follow on later runs.
 * generateActionPlan also checks the workspace AI budget. Cases are written from the issue itself, no AI.
 * Idempotent: an issue that already has a plan (action_plans.cluster_id) or a case (cases.signal_id on one of
 * its records) is skipped.
 */
const RISKY = ["negative", "mixed"];
const PRIORITY = { CRITICAL: "critical", HIGH: "high", MEDIUM: "medium", LOW: "low" };

export function strategyFor(cluster) {
    const impact = String(cluster.impact || "").toUpperCase();
    if (cluster.sentiment === "negative" && (impact === "HIGH" || impact === "CRITICAL")) return "crisis_response";
    return "pr_response";
}

export function casePriority(cluster) {
    const p = PRIORITY[String(cluster.impact || "").toUpperCase()] || "medium";
    // A told-negatively issue is at least medium even when the label said low.
    return cluster.sentiment === "negative" && p === "low" ? "medium" : p;
}

export function caseText(cluster, lang) {
    const n = cluster.signal_count || 0;
    if (lang === "id") {
        return {
            title: cluster.title,
            description: [
                `${n} pemberitaan tentang isu ini, nada ${cluster.sentiment === "mixed" ? "campuran" : "negatif"}. ${cluster.description || ""}`.trim(),
                "Langkah: (1) verifikasi fakta di balik pemberitaan bersama unit terkait, (2) tetapkan penanggung jawab dan siapkan pernyataan posisi, (3) pantau apakah media lain mengangkat isu ini dalam 7 hari ke depan.",
                "Rencana aksi dari AI ada di Tindak Lanjut → Rencana Aksi.",
            ].join("\n\n"),
        };
    }
    return {
        title: cluster.title,
        description: [
            `${n} stories on this issue, told ${cluster.sentiment === "mixed" ? "with mixed tone" : "negatively"}. ${cluster.description || ""}`.trim(),
            "Steps: (1) verify the facts behind the coverage with the unit involved, (2) assign an owner and prepare a position statement, (3) watch whether other outlets pick it up in the next 7 days.",
            "The AI action plan is under Follow-up → Action Plans.",
        ].join("\n\n"),
    };
}

export async function runIssueFollowUp(workspaceId, { maxPlans = 1, db = supabase, generatePlan, now = Date.now() } = {}) {
    const since = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: clusters } = await db
        .from("narrative_clusters")
        .select("id, title, description, sentiment, impact, signal_count, updated_at")
        .eq("workspace_id", workspaceId)
        .in("sentiment", RISKY)
        .gte("signal_count", 2)
        .gte("updated_at", since);
    const out = { plans: 0, cases: 0, skipped: 0 };
    if (!clusters?.length) return out;

    const lang = await workspaceLanguage(workspaceId);
    const { data: plans } = await db.from("action_plans").select("cluster_id").eq("workspace_id", workspaceId).not("cluster_id", "is", null);
    const planned = new Set((plans || []).map((p) => p.cluster_id));
    const { data: cases } = await db.from("cases").select("signal_id").eq("workspace_id", workspaceId).not("signal_id", "is", null);
    const caseSignals = new Set((cases || []).map((c) => c.signal_id));

    // Biggest issues first, so the AI budget goes where it matters.
    const ordered = [...clusters].sort((a, b) => (b.signal_count || 0) - (a.signal_count || 0));
    for (const cluster of ordered) {
        const { data: links } = await db.from("narrative_cluster_signals").select("signal_id").eq("cluster_id", cluster.id).limit(50);
        const signalIds = (links || []).map((l) => l.signal_id).filter(Boolean);
        if (!signalIds.length) { out.skipped++; continue; }

        if (!signalIds.some((id) => caseSignals.has(id))) {
            const text = caseText(cluster, lang);
            const { error } = await db.from("cases").insert({
                workspace_id: workspaceId,
                title: text.title,
                description: text.description,
                priority: casePriority(cluster),
                signal_id: signalIds[0],
                status: "open",
                deadline: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
            });
            if (!error) { out.cases++; caseSignals.add(signalIds[0]); }
        }

        if (!planned.has(cluster.id) && out.plans < maxPlans && generatePlan) {
            try {
                await generatePlan({ workspaceId, strategyType: strategyFor(cluster), clusterId: cluster.id });
                out.plans++;
                planned.add(cluster.id);
            } catch (err) {
                logStructured("warn", "issue_follow_up_plan_failed", { workspaceId, clusterId: cluster.id, error: err.message, code: err.code });
                if (err.code === "BUDGET_EXCEEDED") break;
            }
        }
    }
    if (out.plans || out.cases) logStructured("info", "issue_follow_up_done", { workspaceId, ...out });
    return out;
}
