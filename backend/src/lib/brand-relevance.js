/**
 * Brand relevance: does a stored record actually concern this workspace's
 * brand? A record collected by a keyword search is not automatically about
 * the brand (Google News matches far beyond the headline), so the decision is
 * made from the record's own stored text, with explicit rules:
 *
 *   direct       the title or text names the brand (brand name, or a
 *                monitoring keyword that is the brand)
 *   indirect     names another configured monitoring keyword, not the brand
 *   competitor   names a configured competitor but not the brand
 *   unconfirmed  names none of them; it may still be industry context, but
 *                nothing stored shows that it concerns the brand
 *
 * These are rule-based categories, not scores or probabilities.
 */

// Placeholder names that are never a client brand (the product's own name,
// onboarding defaults).
const PLACEHOLDER_BRANDS = new Set(["narriv", "my workspace", "workspace", "demo"]);

export const RELEVANCE = ["direct", "indirect", "competitor", "unconfirmed"];

export function normalizeText(value) {
    return String(value || "")
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function uniqueTerms(values) {
    const out = [];
    for (const v of values) {
        const n = normalizeText(v);
        // Very short terms ("bi", "ojk") match inside unrelated words too often.
        if (n.length >= 3 && !out.includes(n)) out.push(n);
    }
    return out;
}

/**
 * Builds the matching context from configured values only.
 * brandSource tells the reader where the brand terms came from.
 */
export function buildRelevanceContext({ brandName = null, keywords = [], competitors = [] } = {}) {
    const brand = normalizeText(brandName);
    const hasBrand = brand.length >= 3 && !PLACEHOLDER_BRANDS.has(brand);
    const kw = uniqueTerms(keywords);
    // A keyword that contains the brand name is the brand ("bank mandiri livin").
    // Without a usable brand name, the monitoring keywords stand in for it.
    const brandTerms = hasBrand ? uniqueTerms([brandName, ...kw.filter((k) => k.includes(brand))]) : kw;
    const keywordTerms = hasBrand ? kw.filter((k) => !brandTerms.includes(k)) : [];
    const competitorTerms = uniqueTerms(competitors).filter((c) => !brandTerms.includes(c));
    return {
        configured: brandTerms.length > 0,
        brandSource: hasBrand ? "brand_name" : kw.length ? "keywords" : "none",
        brandTerms,
        keywordTerms,
        competitorTerms,
    };
}

function mentions(text, term) {
    if (!term) return false;
    if (` ${text} `.includes(` ${term} `)) return true;
    // Hashtags and handles join words: "#BankMandiri".
    const compact = term.replace(/ /g, "");
    return compact !== term && ` ${text} `.includes(` ${compact} `);
}

/** Returns { relevance, matched } for one record, from its stored text. */
export function classifyRecord(record, ctx) {
    if (!ctx?.configured) return { relevance: "unconfirmed", matched: null };
    const text = normalizeText([record.title, record.content].filter(Boolean).join(" "));
    const find = (terms) => terms.find((t) => mentions(text, t)) || null;
    let m = find(ctx.brandTerms);
    if (m) return { relevance: "direct", matched: m };
    m = find(ctx.keywordTerms);
    if (m) return { relevance: "indirect", matched: m };
    m = find(ctx.competitorTerms);
    if (m) return { relevance: "competitor", matched: m };
    return { relevance: "unconfirmed", matched: null };
}

export function relevanceCounts(records, ctx) {
    const c = { direct: 0, indirect: 0, competitor: 0, unconfirmed: 0 };
    for (const r of records) c[classifyRecord(r, ctx).relevance]++;
    return c;
}

/**
 * Loads the configured brand name, active keywords and the competitors named
 * in the workspace's latest AI Visibility run (the only place they are stored).
 */
export async function loadRelevanceContext(db, workspaceId) {
    const [settings, keywords, visibility] = await Promise.all([
        db.from("workspace_settings").select("brand_name").eq("workspace_id", workspaceId).maybeSingle(),
        db.from("monitoring_keywords").select("keyword, is_active").eq("workspace_id", workspaceId),
        db.from("ai_visibility_results").select("result").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(1),
    ]);
    const competitors = visibility.error ? [] : visibility.data?.[0]?.result?.metadata?.competitors;
    return buildRelevanceContext({
        brandName: settings.error ? null : settings.data?.brand_name || null,
        keywords: keywords.error ? [] : (keywords.data || []).filter((k) => k.is_active !== false).map((k) => k.keyword),
        competitors: Array.isArray(competitors) ? competitors.filter((c) => typeof c === "string") : [],
    });
}
