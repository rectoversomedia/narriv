/**
 * Claim check for risky issues (Indonesia's hoax problem): AI pulls the 1–3 factual claims an issue rests on
 * (one Haiku call, only when its records change), then each claim is matched against Indonesian fact-check feeds
 * (TurnBackHoax / Mafindo and CekFakta, free RSS). A claim that matches a published "[SALAH]/[HOAKS]" check becomes
 * "refuted" with the link; otherwise it stays "unverified" until someone marks it. Stored on the cluster
 * (metadata.claims) so reading an issue costs nothing.
 */

import { anyAiConfigured, getChatClient } from "./chat-client.js";
import { checkBudgetAllowance } from "./cost-management.js";
import { logStructured } from "./logger.js";

const FEEDS = ["https://turnbackhoax.id/feed/", "https://cekfakta.com/feed"];
const STOP = new Set(["yang", "dan", "di", "ke", "dari", "untuk", "dengan", "ini", "itu", "akan", "telah", "sudah", "pada", "atau", "tidak", "bank", "the", "a", "of"]);

const words = (t) => new Set(String(t || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));
export function overlap(a, b) {
    const A = words(a), B = words(b);
    if (!A.size || !B.size) return 0;
    let n = 0;
    for (const w of A) if (B.has(w)) n++;
    return n / Math.min(A.size, B.size);
}

let feedCache = { at: 0, items: [] };
/** Latest fact-checks from the feeds (cached an hour): { title, url, verdict }. */
export async function factChecks({ fetchImpl = fetch } = {}) {
    if (Date.now() - feedCache.at < 3600000 && feedCache.items.length) return feedCache.items;
    const items = [];
    for (const url of FEEDS) {
        try {
            const res = await fetchImpl(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; NarrivMonitor/1.0)" }, signal: AbortSignal.timeout(10000) });
            if (!res.ok) continue;
            const xml = await res.text();
            for (const m of xml.matchAll(/<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<link>([^<]+)<\/link>/g)) {
                const title = m[1].replace(/&#8220;|&#8221;/g, '"').replace(/&#8211;/g, "–").replace(/&amp;/g, "&").trim();
                const verdict = /\[(SALAH|HOAKS|HOAX|DISINFORMASI|MISINFORMASI|PENIPUAN)\]/i.test(title) ? "refuted" : /\[(BENAR|FAKTA)\]/i.test(title) ? "confirmed" : null;
                if (verdict) items.push({ title, url: m[2].trim(), verdict });
            }
        } catch (error) {
            logStructured("warn", "fact_check_feed_failed", { url, error: error.message });
        }
    }
    feedCache = { at: Date.now(), items };
    return items;
}

/** Match claims to fact-checks; the best match above the threshold sets the status. */
export function matchClaims(claims, checks, threshold = 0.5) {
    return claims.map((c) => {
        const best = checks.map((f) => ({ f, s: overlap(c.claim, f.title) })).sort((a, b) => b.s - a.s)[0];
        return best && best.s >= threshold
            ? { ...c, status: best.f.verdict, source: { title: best.f.title, url: best.f.url } }
            : { ...c, status: c.status || "unverified", source: c.source || null };
    });
}

/** Claims for one issue, refreshed when its records change. Returns the stored object or null. */
export async function checkClaims({ cluster, members, db, chat = getChatClient(), fetchImpl = fetch, lang = "id" }) {
    const signature = `${members.length}:${members.map((m) => m.id).sort().slice(0, 30).join(",")}`;
    const stored = cluster.metadata?.claims;
    if (stored?.signature === signature) return stored;
    if (!anyAiConfigured() && !chat) return stored || null;
    const allowance = await checkBudgetAllowance(cluster.workspace_id).catch(() => ({ allowed: true }));
    if (allowance?.allowed === false) return stored || null;
    try {
        const list = members.slice(0, 25).map((m, i) => `${i + 1}. ${String(m.title || "").slice(0, 160)}`).join("\n");
        const res = await chat.chat.completions.create({
            messages: [
                { role: "system", content: "You extract the factual claims a news/social issue rests on, for a communications team checking for hoaxes. Return JSON only." },
                { role: "user", content: `Issue: ${cluster.title}\n\nHeadlines and posts:\n${list}\n\nReturn {"claims":[{"claim":"one checkable factual statement, ${lang === "en" ? "in English" : "dalam Bahasa Indonesia"}, under 18 words"}]} with 1 to 3 claims that, if false, would make this a hoax. Skip opinions.` },
            ],
            response_format: { type: "json_object" },
            max_tokens: 400,
            temperature: 0,
        });
        const parsed = JSON.parse(res?.choices?.[0]?.message?.content || "{}");
        const claims = (Array.isArray(parsed.claims) ? parsed.claims : []).map((c) => ({ claim: String(c?.claim || "").slice(0, 200) })).filter((c) => c.claim).slice(0, 3);
        const items = matchClaims(claims, await factChecks({ fetchImpl }));
        const result = { signature, items, at: new Date().toISOString() };
        await db.from("narrative_clusters").update({ metadata: { ...(cluster.metadata || {}), claims: result } }).eq("id", cluster.id);
        return result;
    } catch (error) {
        logStructured("warn", "claim_check_failed", { clusterId: cluster.id, error: error?.message || error });
        return stored || null;
    }
}
