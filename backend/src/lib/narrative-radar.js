/**
 * Narriv Radar: the day's narrative intelligence brought to where people read (email, WhatsApp, Slack, Teams),
 * in the "what we found → what to do" shape, so a director never has to open the dashboard to know what matters.
 * Built from stored data only (risk factors, coordination, claims, action plans): no AI call.
 */
import supabase from "./supabase.js";
import { narrativeRisk } from "./narrative-risk.js";

const STEP = {
    network: "Laporkan akun terkoordinasi ke platform dan jangan membalas satu per satu.",
    claims: "Terbitkan fakta dari kanal resmi untuk membantah klaim yang sudah terbukti hoaks.",
    topic: "Libatkan tim legal atau kepatuhan sebelum memberi pernyataan.",
    speed: "Siapkan pernyataan sementara hari ini, sebelum media lain ikut mengutip.",
    tone: "Tunjuk satu juru bicara dan pantau perkembangan setiap 2 jam.",
    toxicity: "Moderasi kolom komentar kanal resmi dan simpan bukti ujaran kasar.",
    polarity: "Hindari memihak; jelaskan fakta dan langkah yang diambil.",
    reach: "Brief media yang paling aktif dengan data pendukung.",
};

export async function buildRadar(workspaceId, { db = supabase, now = Date.now(), limit = 3 } = {}) {
    const since = new Date(now - 14 * 86400000).toISOString();
    const { data: clusters } = await db
        .from("narrative_clusters")
        .select("id, title, description, keywords, sentiment, metadata, narrative_cluster_signals(signal:signals(id, title, platform, sentiment, captured_at, analyses:signal_analyses(analysis)))")
        .eq("workspace_id", workspaceId)
        .gte("updated_at", since)
        .limit(60);
    const scored = (clusters || []).map((c) => {
        const members = (c.narrative_cluster_signals || []).map((l) => l.signal).filter(Boolean);
        return { c, members, risk: narrativeRisk(c, members, now) };
    }).filter((x) => x.risk && x.risk.score >= 40).sort((a, b) => b.risk.score - a.risk.score).slice(0, limit);
    if (!scored.length) return { items: [], at: new Date(now).toISOString() };
    const { data: plans } = await db.from("action_plans").select("cluster_id, title, strategy, created_at").eq("workspace_id", workspaceId).in("cluster_id", scored.map((x) => x.c.id)).order("created_at", { ascending: false });
    const items = scored.map(({ c, members, risk }) => {
        const plan = (plans || []).find((p) => p.cluster_id === c.id);
        const refuted = (c.metadata?.claims?.items || []).filter((x) => x.status === "refuted").map((x) => x.claim);
        const coord = c.metadata?.coordination?.count || 0;
        const finding = [
            `${members.length} catatan, skor risiko ${risk.score}/100.`,
            risk.factors.slice(0, 2).map((f) => f.label).join("; ") + ".",
            coord ? `Ada ${coord} indikasi akun terkoordinasi.` : "Belum ada indikasi akun terkoordinasi; sebagian besar tampak organik.",
            refuted.length ? `Klaim terbukti hoaks: "${refuted[0]}".` : "",
        ].filter(Boolean).join(" ");
        let strategy = null;
        try { strategy = typeof plan?.strategy === "string" ? JSON.parse(plan.strategy) : plan?.strategy; } catch { strategy = null; }
        const planStep = strategy?.immediate_actions?.[0] || strategy?.balanced?.immediate_actions?.[0];
        const action = (typeof planStep === "string" ? planStep : planStep?.action) || STEP[risk.factors[0]?.key] || STEP.tone;
        return { id: c.id, title: c.title, score: risk.score, level: risk.level, finding, action };
    });
    return { items, at: new Date(now).toISOString() };
}

export function radarText(radar, brand) {
    const lines = [`*Narriv Radar · ${brand}*`, ""];
    radar.items.forEach((it, i) => {
        lines.push(`${i + 1}. *${it.title}* (risiko ${it.score})`);
        lines.push(`   Temuan: ${it.finding}`);
        lines.push(`   Langkah: ${it.action}`);
        lines.push("");
    });
    return lines.join("\n");
}
