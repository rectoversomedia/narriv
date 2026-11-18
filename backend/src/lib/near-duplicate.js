/**
 * Near-duplicates: the same story stored twice under different links (Google News redirect URLs, a republished
 * article, an outlet's mobile and desktop page). Only the same outlet counts: the same press release carried by two
 * outlets is two mentions, because that is how far it reached. Rule-based, no AI.
 */
const STOP = new Set(["di", "dan", "ke", "dari", "yang", "untuk", "ini", "itu", "the", "a", "of", "to", "in", "and"]);

/** Title words, lower-case, without the " - Outlet" suffix Google News adds and without punctuation. */
export function titleTokens(title) {
    const t = String(title || "").replace(/\s+[-–|]\s+[^-–|]{2,40}$/, "");
    return t.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter((w) => w && !STOP.has(w));
}

export function outletKey(record) {
    return String(record?.metadata?.publisher || record?.author || "").trim().toLowerCase();
}

/** Same outlet and (almost) the same headline: at least 4 words and 85% of them shared. */
export function isNearDuplicate(a, b) {
    const oa = outletKey(a), ob = outletKey(b);
    if (!oa || oa !== ob) return false;
    const ta = new Set(titleTokens(a.title)), tb = new Set(titleTokens(b.title));
    if (ta.size < 4 || tb.size < 4) return false;
    let shared = 0;
    for (const w of ta) if (tb.has(w)) shared++;
    return shared / Math.max(ta.size, tb.size) >= 0.85;
}
