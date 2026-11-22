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
        .select("id, title, description, keywords, sentiment, metadata, narrative_cluster_signals(signal:signals(id, title, platform, sentiment, captured_at, metadata, analyses:signal_analyses(analysis)))")
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
        // Momentum: records in the last 72 hours against the 72 hours before (Blackbird-style "2.6x in 72h").
        const t = (m) => Date.parse(m.captured_at || 0);
        const last = members.filter((m) => now - t(m) < 72 * 3600000).length;
        const prev = members.filter((m) => now - t(m) >= 72 * 3600000 && now - t(m) < 144 * 3600000).length;
        const momentum = last ? (prev ? Math.round((last / prev) * 10) / 10 : null) : 0;
        const priority = risk.score >= 70 || (risk.score >= 50 && (momentum === null || momentum >= 2)) ? "P1" : "P2";
        return { id: c.id, title: c.title, score: risk.score, level: risk.level, finding, action, momentum, last72h: last, priority, factors: risk.factors };
    });
    return { items, at: new Date(now).toISOString() };
}

export function radarText(radar, brand) {
    const lines = [`*Narriv Radar · ${brand}*`, ""];
    radar.items.forEach((it, i) => {
        const mom = it.momentum === null ? `${it.last72h} catatan baru dalam 72 jam` : it.momentum ? `${it.momentum}x dalam 72 jam` : "melandai";
        lines.push(`${i + 1}. [${it.priority}] *${it.title}* (risiko ${it.score} · ${mom})`);
        lines.push(`   Temuan: ${it.finding}`);
        lines.push(`   Langkah: ${it.action}`);
        lines.push("");
    });
    lines.push("Balas: *detail 1* untuk rincian isu 1, *radar* untuk ringkasan terbaru.");
    return lines.join("\n");
}

/**
 * A reply typed in WhatsApp or Telegram to the Radar: "detail 2" (or just "2") → the reasons and the step for issue 2;
 * "radar" → the latest digest; anything else → how to use it.
 */
export async function radarReply(workspaceId, message, { db = supabase, brand = "Narriv", now = Date.now() } = {}) {
    const msg = String(message || "").trim().toLowerCase();
    const radar = await buildRadar(workspaceId, { db, now });
    if (!radar.items.length) return "Narriv Radar: belum ada isu berisiko saat ini. Kami kabari begitu ada.";
    if (/^(radar|ringkasan|update)\b/.test(msg)) return radarText(radar, brand);
    const n = Number(msg.match(/^(?:detail\s*)?(\d)\b/)?.[1]);
    const it = n ? radar.items[n - 1] : null;
    if (it) {
        return [
            `*${it.title}* · risiko ${it.score}/100 (${it.priority})`,
            "",
            "Kenapa berisiko:",
            ...it.factors.slice(0, 5).map((f) => `• ${f.label} (+${f.points})`),
            "",
            `Temuan: ${it.finding}`,
            `Langkah: ${it.action}`,
            "",
            `Buka isu: ${process.env.FRONTEND_URL || "https://app.narriv.digital"}/intelligence/${it.id}`,
        ].join("\n");
    }
    return "Narriv Radar. Balas *radar* untuk ringkasan terbaru, atau *detail 1* (2, 3) untuk rincian satu isu.";
}
