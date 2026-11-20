/**
 * Kotak Cek Klaim: someone pastes a claim or a link and gets a verdict with its sources. Order of evidence:
 *   1. a published fact-check (TurnBackHoax / CekFakta) that matches → that verdict, with the link;
 *   2. otherwise news coverage of the claim, read by one Haiku call → an AI assessment, labelled as such;
 *   3. otherwise "unverified".
 */
import { factChecks, overlap, searchFactChecks } from "./claim-check.js";
import { aiJson } from "./ai-json.js";
import { assertPublicHttpUrl } from "./url-safety.js";

const STOPS = new Set(["yang", "dan", "di", "ke", "dari", "untuk", "dengan", "ini", "itu", "akan", "telah", "sudah", "pada", "atau", "tidak", "bahwa", "karena", "adalah", "bisa", "ada"]);
const keywords = (t) => String(t).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2 && !STOPS.has(w)).slice(0, 7).join(" ");

const meta = (html, name) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)`, "i"))?.[1]
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, "i"))?.[1];
const decode = (s) => String(s || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim();

/** The claim a link makes: its title and description. */
export async function claimFromUrl(url, { fetchImpl = fetch } = {}) {
    const safe = await assertPublicHttpUrl(url);
    const res = await fetchImpl(String(safe), { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; NarrivMonitor/1.0)" }, signal: AbortSignal.timeout(10000) });
    const html = (await res.text()).slice(0, 300000);
    const title = decode(meta(html, "og:title") || html.match(/<title[^>]*>([^<]+)/i)?.[1]);
    const desc = decode(meta(html, "og:description") || meta(html, "description"));
    return { title, description: desc, text: [title, desc].filter(Boolean).join(". ").slice(0, 500) };
}

export async function checkClaimInput({ workspaceId, input, chat, fetchImpl = fetch }) {
    const isUrl = /^https?:\/\//i.test(input.trim());
    let claim = input.trim().slice(0, 500), page = null;
    if (isUrl) {
        page = await claimFromUrl(input.trim(), { fetchImpl }).catch(() => null);
        if (!page?.text) return { input, claim: null, verdict: "unverified", method: "none", reason: "Tautan tidak bisa dibaca. Tempel isi klaimnya langsung.", factChecks: [], coverage: [] };
        claim = page.text;
    }
    const q = keywords(claim);
    const { fetchRssFeed } = await import("../modules/ingestion/rss-ingestion.service.js");
    const searched = await searchFactChecks(claim, { fetchImpl });
    const checks = [...searched, ...(await factChecks({ fetchImpl }).catch(() => []))]
        .map((f) => ({ ...f, score: overlap(claim, f.title) })).filter((f) => f.score >= 0.35).sort((a, b) => b.score - a.score).slice(0, 3);
    const coverage = (await fetchRssFeed(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=id&gl=ID&ceid=ID:id`).catch(() => [])).filter((n) => n.title && n.title.toLowerCase() !== String(n.publisher || "").toLowerCase() && !/^cekfakta\.com$/i.test(n.title)).slice(0, 8).map((n) => ({ title: n.title, url: n.url, source: n.publisher || null }));
    const best = checks[0];
    if (best && best.score >= 0.5) {
        return { input, claim, verdict: best.verdict, method: "fact_check", reason: `Cocok dengan cek fakta: ${best.title}`, factChecks: checks, coverage };
    }
    const ai = await aiJson({
        workspaceId, chat, operation: "claim_box", maxTokens: 400,
        system: "You assess whether a claim circulating in Indonesia is supported by the news coverage given. Use only the evidence given; when it is thin, answer unverified.",
        user: `Klaim: ${claim}\n\nCek fakta yang mirip:\n${checks.map((c) => `- ${c.title}`).join("\n") || "(tidak ada)"}\n\nPemberitaan terkait:\n${coverage.map((c) => `- ${c.title}`).join("\n") || "(tidak ada)"}\n\nReturn {"verdict":"likely_false|likely_true|unverified","reason":"1-2 kalimat Bahasa Indonesia yang menyebut bukti mana yang dipakai"}`,
    });
    const verdict = ["likely_false", "likely_true", "unverified"].includes(ai?.verdict) ? ai.verdict : "unverified";
    return { input, claim, verdict, method: ai ? "ai_assessment" : "none", reason: ai?.reason || "Belum ada cek fakta atau pemberitaan yang cukup untuk menilai klaim ini.", factChecks: checks, coverage };
}
