/**
 * Cek Influencer / Akun (Narriv Recon): risk check on one person, account or organisation before a brand works with
 * them (KOL, brand ambassador, spokesperson, executive). Public coverage of the subject (Google News, publisher RSS,
 * YouTube when configured, and the workspace's own stored records) is matched against Indonesian risk lenses
 * (rule-based, explainable), then one Haiku call writes the executive summary. No AI: the matrix still works.
 */
import supabase from "./supabase.js";
import { aiJson } from "./ai-json.js";
import { logStructured } from "./logger.js";
import { mentionsKeyword } from "./keyword-match.js";

export const RECON_LENSES = [
    { key: "legal", id: "Hukum & kriminal", en: "Legal & criminal", weight: 3, re: /\b(ditangkap|tersangka|terdakwa|dilaporkan ke polisi|polisikan|gugatan|digugat|penipuan|narkoba|korupsi|pidana|vonis|dipenjara|ditahan|penggelapan)\b/i },
    { key: "gambling", id: "Judi online & pinjol", en: "Online gambling & illegal lending", weight: 3, re: /\b(judi|judol|slot online|togel|situs judi|pinjol|investasi bodong|robot trading|binary option|trading ilegal|afiliator)\b/i },
    { key: "sara", id: "SARA & ujaran kebencian", en: "Hate speech & SARA", weight: 3, re: /\b(sara|rasis|rasisme|penistaan|penodaan agama|ujaran kebencian|kafir|intoleran)\b/i },
    { key: "violence", id: "Kekerasan & pelecehan", en: "Violence & harassment", weight: 3, re: /\b(kekerasan|pelecehan|kdrt|penganiayaan|perundungan|bully|bullying|ancaman|doxing)\b/i },
    { key: "hoax", id: "Hoaks & misinformasi", en: "Hoaxes & misinformation", weight: 2, re: /\b(hoaks|hoax|disinformasi|misinformasi|menyesatkan|berita palsu|teori konspirasi)\b/i },
    { key: "controversy", id: "Kontroversi & skandal", en: "Controversy & scandal", weight: 2, re: /\b(skandal|kontroversi|kontroversial|dikecam|kecaman|dihujat|boikot|minta maaf|permintaan maaf|klarifikasi|viral)\b/i },
    { key: "promo", id: "Promosi bermasalah", en: "Problematic promotion", weight: 2, re: /\b(endorse|promosi|iklan|paid promote)\b.*\b(ilegal|tanpa izin|ojk|bpom|dilarang|ditegur|diblokir)\b|\b(ilegal|tanpa izin)\b.*\b(endorse|promosi)\b/i },
    { key: "politics", id: "Politik praktis", en: "Partisan politics", weight: 1, re: /\b(pilpres|pilkada|caleg|partai|kampanye|paslon|buzzer|relawan politik)\b/i },
    { key: "lifestyle", id: "Gaya hidup berisiko", en: "Risky lifestyle", weight: 1, re: /\b(mabuk|miras|alkohol|flexing|pamer harta|ugal-ugalan|balap liar|tilang)\b/i },
];

const levelOf = (s) => (s >= 70 ? "critical" : s >= 45 ? "high" : s >= 20 ? "medium" : "low");

/** The rule-based matrix for a list of items { title, summary, url, source, publishedAt, platform }. */
export function reconMatrix(items) {
    const lenses = RECON_LENSES.map((l) => {
        const hits = items.filter((it) => l.re.test(`${it.title} ${it.summary || ""}`));
        const byPlatform = {};
        for (const h of hits) byPlatform[h.platform] = (byPlatform[h.platform] || 0) + 1;
        return { key: l.key, label: { id: l.id, en: l.en }, hits: hits.length, byPlatform, level: hits.length >= 4 ? "high" : hits.length >= 2 ? "medium" : hits.length ? "low" : "none", examples: hits.slice(0, 3).map((h) => ({ title: h.title, url: h.url, source: h.source, publishedAt: h.publishedAt })) };
    });
    const raw = lenses.reduce((n, l) => n + Math.min(l.hits, 5) * RECON_LENSES.find((x) => x.key === l.key).weight * 3, 0);
    const score = items.length ? Math.min(100, raw) : 0;
    return { score, level: levelOf(score), lenses: lenses.sort((a, b) => b.hits - a.hits) };
}

export async function runRecon({ workspaceId, subject, days = 365, db = supabase, chat, fetchImpl = fetch, store = true }) {
    const since = Date.now() - days * 86400000;
    const { fetchGoogleNewsRss } = await import("../modules/ingestion/rss-ingestion.service.js");
    const { fetchPublisherArticles } = await import("../modules/ingestion/publisher-rss.service.js");
    const { fetchYouTubeVideos } = await import("../modules/ingestion/official-sources.service.js");
    const items = [];
    const push = (it) => { if (it.url && !items.some((x) => x.url === it.url)) items.push(it); };
    const [news, pub, yt, stored] = await Promise.all([
        fetchGoogleNewsRss(`${subject}`, { limit: 60 }).catch(() => []),
        fetchPublisherArticles(subject, { limit: 15, fetchImpl }).catch(() => []),
        process.env.YOUTUBE_API_KEY ? fetchYouTubeVideos(subject, { limit: 15, fetchImpl }).catch(() => []) : [],
        db.from("signals").select("title, content, url, platform, author, published_at").eq("workspace_id", workspaceId).ilike("title", `%${subject.replace(/[%_]/g, "")}%`).limit(60).then((r) => r.data || []).catch(() => []),
    ]);
    for (const n of news) push({ title: n.title, summary: n.content || "", url: n.url, source: n.publisher || "Berita", publishedAt: n.publishedAt || n.published_at || null, platform: "news" });
    for (const p of pub) push({ title: p.title, summary: p.content, url: p.url, source: p.author, publishedAt: p.publishedAt, platform: "news" });
    for (const v of yt) push({ title: v.title, summary: v.content || "", url: v.url, source: v.author || "YouTube", publishedAt: v.publishedAt, platform: "youtube" });
    for (const s of stored) push({ title: s.title, summary: String(s.content || "").slice(0, 400), url: s.url, source: s.author || s.platform, publishedAt: s.published_at, platform: s.platform || "news" });
    const relevant = items.filter((it) => (!it.publishedAt || Date.parse(it.publishedAt) >= since) && mentionsKeyword(`${it.title} ${it.summary}`, subject));
    const matrix = reconMatrix(relevant);
    const flagged = matrix.lenses.filter((l) => l.hits).flatMap((l) => l.examples.map((e) => `[${l.label.id}] ${e.title}`)).slice(0, 20);
    const ai = await aiJson({
        workspaceId, chat, operation: "recon_summary", maxTokens: 500,
        system: "You are a reputation-risk analyst in Indonesia checking a person or organisation before a brand partners with them. Be factual and cautious: say 'indikasi' and never state guilt.",
        user: `Subjek: ${subject}\nJumlah pemberitaan relevan: ${relevant.length}\nSkor risiko aturan: ${matrix.score}/100\nJudul yang tertandai:\n${flagged.join("\n") || "(tidak ada)"}\nJudul lain:\n${relevant.slice(0, 12).map((r) => r.title).join("\n")}\n\nReturn {"summary":"3 kalimat ringkasan eksekutif dalam Bahasa Indonesia","recommendation":"1 kalimat: aman dilanjutkan / lanjutkan dengan syarat / tunda dan cek lebih dalam, beserta alasannya"}`,
    });
    const result = {
        subject, days, at: new Date().toISOString(), sources: relevant.length,
        platforms: [...new Set(relevant.map((r) => r.platform))],
        ...matrix,
        summary: ai?.summary || (relevant.length ? `${relevant.length} pemberitaan tentang ${subject} ditemukan; ${matrix.lenses.filter((l) => l.hits).length} kategori risiko tertandai.` : `Belum ada pemberitaan publik tentang ${subject} yang ditemukan.`),
        recommendation: ai?.recommendation || null,
        recent: relevant.slice(0, 8).map((r) => ({ title: r.title, url: r.url, source: r.source, publishedAt: r.publishedAt, platform: r.platform })),
    };
    if (!store) return { id: null, ...result };
    const { data, error } = await db.from("raw_documents").insert({ workspace_id: workspaceId, external_id: `recon:${Date.now()}`, title: subject, metadata: { recon: result } }).select("id").maybeSingle();
    if (error) logStructured("warn", "recon_store_failed", { error: error.message });
    return { id: data?.id || null, ...result };
}
