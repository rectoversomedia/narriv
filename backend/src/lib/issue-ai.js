/**
 * Two AI tools on one issue, each a single Haiku call over stored data:
 *   investigationBrief: a report an analyst would write (what happened, timeline, actors, coordination, claims, risk,
 *     recommendations), grounded in the issue's own records;
 *   simulateResponse: "if we respond like this, where does the story go in 24 hours?" — a T+0/6/12/24h projection
 *     with the audience groups that can still be moved. Clearly labelled as a projection.
 */
import supabase from "./supabase.js";
import { aiJson } from "./ai-json.js";
import { narrativeRisk } from "./narrative-risk.js";

export async function issueContext(workspaceId, clusterId, { db = supabase } = {}) {
    const { data: c } = await db.from("narrative_clusters")
        .select("id, title, description, keywords, sentiment, metadata, narrative_cluster_signals(signal:signals(id, title, platform, sentiment, author, captured_at, published_at, analyses:signal_analyses(analysis)))")
        .eq("workspace_id", workspaceId).eq("id", clusterId).maybeSingle();
    if (!c) return null;
    const members = (c.narrative_cluster_signals || []).map((l) => l.signal).filter(Boolean)
        .sort((a, b) => Date.parse(a.published_at || a.captured_at || 0) - Date.parse(b.published_at || b.captured_at || 0));
    const risk = narrativeRisk(c, members);
    const lines = members.slice(-40).map((m) => `${String(m.published_at || m.captured_at || "").slice(0, 10)} [${m.platform}] ${m.author ? `${m.author}: ` : ""}${String(m.title || "").slice(0, 150)}`);
    const claims = (c.metadata?.claims?.items || []).map((x) => `- ${x.claim} (${x.status})`);
    const coord = c.metadata?.coordination;
    const text = `Isu: ${c.title}\nDeskripsi: ${c.description || "-"}\nSkor risiko: ${risk?.score ?? "-"}/100 (${(risk?.factors || []).map((f) => f.label).join("; ")})\nKoordinasi: ${coord?.count ? `${coord.count} indikasi (${(coord.kinds || []).join(", ")})` : "tidak ada indikasi"}\nKlaim:\n${claims.join("\n") || "-"}\n\nCatatan (urut waktu):\n${lines.join("\n")}`;
    return { cluster: c, members, risk, text };
}

export async function investigationBrief({ workspaceId, clusterId, chat, db }) {
    const ctx = await issueContext(workspaceId, clusterId, { db });
    if (!ctx) return null;
    const out = await aiJson({
        workspaceId, chat, operation: "investigation_brief", maxTokens: 1400,
        system: "You are a senior narrative-intelligence analyst in Indonesia writing for a bank's or brand's communications director. Ground every statement in the records given; do not invent accounts, numbers or events. Write in Bahasa Indonesia.",
        user: `${ctx.text}\n\nReturn {"summary":"3 kalimat","timeline":[{"when":"tanggal","what":"apa yang terjadi"}],"actors":[{"name":"akun/media","role":"peran dalam penyebaran"}],"coordination":"1-2 kalimat","claims":"1-2 kalimat","risk":"1-2 kalimat kenapa skornya segitu","recommendations":["3-5 langkah konkret berurutan"]}. Timeline 3-6 poin, actors maksimal 5.`,
    });
    if (!out) return null;
    return { at: new Date().toISOString(), title: ctx.cluster.title, riskScore: ctx.risk?.score ?? null, records: ctx.members.length, ...out };
}

export async function simulateResponse({ workspaceId, clusterId, response, chat, db }) {
    const ctx = await issueContext(workspaceId, clusterId, { db });
    if (!ctx) return null;
    const out = await aiJson({
        workspaceId, chat, operation: "scenario_simulation", maxTokens: 1200,
        system: "You simulate how an Indonesian online narrative is likely to evolve over the next 24 hours under a given response, as a planning aid. Be realistic, cautious, grounded in the records. Write in Bahasa Indonesia.",
        user: `${ctx.text}\n\nRencana respons yang diuji: ${response || "Tidak merespons (diam)"}\n\nReturn {"steps":[{"t":"T+0","headline":"judul/percakapan yang kemungkinan muncul","sentiment":"negatif|campuran|netral|positif","volume":"naik|stabil|turun","note":"1 kalimat"}],"audiences":[{"group":"kelompok audiens","now":"sikap sekarang","movable":true}],"risks":["2-3 risiko lanjutan"],"verdict":"1-2 kalimat: apakah respons ini meredam atau memperburuk","better":"1 kalimat alternatif yang lebih baik jika ada"}. Steps tepat 4: T+0, T+6j, T+12j, T+24j.`,
    });
    if (!out) return null;
    return { at: new Date().toISOString(), response: response || null, title: ctx.cluster.title, ...out };
}
