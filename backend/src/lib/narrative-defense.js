/**
 * Narrative defence, run after each data pull (cron follow-ups) for a workspace:
 *   1. coordination per issue: the coordination signs among the comments under the issue's own videos are stored on
 *      the issue (metadata.coordination), which feeds its risk score;
 *   2. claim check for risky issues (claim-check.js), at most `maxClaims` AI calls per run;
 *   3. a "narrative attack" alert when an issue is high-risk AND shows coordination: more urgent than a plain
 *      negative spike, once per issue.
 */

import supabase from "./supabase.js";
import { logStructured } from "./logger.js";
import { detectCoordination } from "./conversation-network.js";
import { narrativeRisk } from "./narrative-risk.js";
import { checkClaims } from "./claim-check.js";
import { workspaceLanguage } from "./workspace-language.js";

export async function runNarrativeDefense(workspaceId, { db = supabase, maxClaims = 2, chat, now = Date.now() } = {}) {
    const out = { issues: 0, coordinated: 0, claims: 0, attacks: 0 };
    const since = new Date(now - 30 * 86400000).toISOString();
    const { data: clusters } = await db
        .from("narrative_clusters")
        .select("id, workspace_id, title, description, keywords, sentiment, metadata, narrative_cluster_signals(signal:signals(id, title, platform, sentiment, captured_at, url))")
        .eq("workspace_id", workspaceId)
        .gte("updated_at", since)
        .limit(60);
    if (!clusters?.length) return out;

    // Comments per video id (signal id), from the stored YouTube comment documents.
    const { data: docs } = await db.from("raw_documents").select("metadata").eq("workspace_id", workspaceId).like("external_id", "ytcomments:%").limit(300);
    const commentsBySignal = new Map((docs || []).filter((d) => d.metadata?.signal_id).map((d) => [d.metadata.signal_id, d.metadata.comments || []]));

    const { data: attacks } = await db.from("alerts").select("metadata").eq("workspace_id", workspaceId).eq("metadata->>rule_triggered", "narrative_attack");
    const attacked = new Set((attacks || []).map((a) => a.metadata?.cluster_id));
    const lang = await workspaceLanguage(workspaceId);
    let claimCalls = 0;

    for (const cluster of clusters) {
        out.issues++;
        const members = (cluster.narrative_cluster_signals || []).map((l) => l.signal).filter(Boolean);
        const comments = members.flatMap((m) => (commentsBySignal.get(m.id) || []).map((c) => ({ ...c, signal_id: m.id })));
        const signs = comments.length ? detectCoordination(comments) : [];
        // No comments under the issue means nothing to measure, not "no coordination": keep what is stored.
        // Demo issues carry seeded coordination and claims: never recompute or spend AI calls on fictional data.
        const demo = Boolean(cluster.metadata?.demo);
        const coordination = !demo && (comments.length || !cluster.metadata?.coordination)
            ? { count: signs.length, kinds: [...new Set(signs.map((s) => s.kind))], at: new Date(now).toISOString() }
            : (cluster.metadata?.coordination || { count: 0, kinds: [] });
        const metadata = { ...(cluster.metadata || {}), coordination };
        if ((cluster.metadata?.coordination?.count || 0) !== coordination.count) {
            await db.from("narrative_clusters").update({ metadata }).eq("id", cluster.id);
        }
        cluster.metadata = metadata;
        if (signs.length) out.coordinated++;

        const risky = ["negative", "mixed"].includes(String(cluster.sentiment)) && members.length >= 2;
        if (!demo && risky && claimCalls < maxClaims && cluster.metadata?.claims?.signature !== `${members.length}:${members.map((m) => m.id).sort().slice(0, 30).join(",")}`) {
            claimCalls++;
            const claims = await checkClaims({ cluster, members, db, chat, lang });
            if (claims) { cluster.metadata = { ...cluster.metadata, claims }; out.claims++; }
        }

        const risk = narrativeRisk(cluster, members, now);
        // Daily risk snapshots, so the score can later be checked against what the story actually did.
        const hist = cluster.metadata?.riskHistory || [];
        if (risk && (!hist.length || now - Date.parse(hist[hist.length - 1].at) > 20 * 3600000)) {
            const riskHistory = [...hist, { at: new Date(now).toISOString(), score: risk.score, records: members.length }].slice(-60);
            cluster.metadata = { ...cluster.metadata, riskHistory };
            await db.from("narrative_clusters").update({ metadata: cluster.metadata }).eq("id", cluster.id);
        }
        if (!demo && risk && risk.score >= 70 && coordination.count > 0 && !attacked.has(cluster.id)) {
            const id = lang === "id";
            const { error } = await db.from("alerts").insert({
                workspace_id: workspaceId,
                type: "risk",
                severity: "critical",
                status: "open",
                title: id ? `Indikasi serangan narasi: ${cluster.title.replace(/^isu\s+/i, "")}` : `Possible narrative attack: ${cluster.title}`,
                description: risk.factors.map((f) => f.label).join(" · "),
                what_happened: id
                    ? `"${cluster.title}" bernilai risiko ${risk.score}/100 dan menunjukkan ${coordination.count} indikasi akun terkoordinasi.`
                    : `"${cluster.title}" scores ${risk.score}/100 on risk and shows ${coordination.count} coordination sign(s).`,
                why_it_matters: id
                    ? "Isu berisiko tinggi yang didorong akun terkoordinasi bisa menyebar jauh lebih cepat dari isu organik dan membentuk persepsi sebelum fakta keluar."
                    : "A high-risk story pushed by coordinated accounts spreads faster than organic talk and shapes perception before the facts are out.",
                what_to_do: id
                    ? "Verifikasi klaim utamanya, terbitkan fakta dari kanal resmi, laporkan akun terkoordinasi ke platform, dan jangan membalas akun tersebut satu per satu."
                    : "Verify the core claims, publish the facts on owned channels, report the coordinated accounts to the platform, and do not reply to them one by one.",
                sources: ["youtube", "news"],
                source: "news",
                metadata: { cluster_id: cluster.id, rule_triggered: "narrative_attack", risk_score: risk.score, coordination, signal_ids: members.slice(0, 10).map((m) => m.id) },
            });
            if (!error) { out.attacks++; attacked.add(cluster.id); }
        }
    }
    if (out.claims || out.attacks) logStructured("info", "narrative_defense_done", { workspaceId, ...out });
    return out;
}
