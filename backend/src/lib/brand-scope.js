/**
 * Brand scope: every keyword of a workspace is read in the context of the workspace's brand. A product or line of
 * business ("Spektra" for FIFGROUP) is a common word elsewhere (an Italian company, a rapper, a physics term), so a
 * record only counts when it names the keyword AND the brand (or one of its aliases). Keywords that are themselves
 * the brand ("FIF", "FIF GROUP" for FIFGROUP) need no second mention.
 *
 * Aliases: the brand name plus every workspace keyword that is a spelling of it (same letters without spaces, or
 * one a prefix of the other, at least 3 letters).
 */
import supabaseAdmin from "./supabase.js";
import { mentionsKeyword, phraseQuery } from "./keyword-match.js";
import { getWorkspaceProfile } from "./workspace-profile.js";

const compact = (s) => String(s || "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "");

function isSpellingOf(term, brand) {
    const a = compact(term), b = compact(brand);
    if (a.length < 3 || b.length < 3) return false;
    return a === b || a.startsWith(b) || b.startsWith(a);
}

// Words that do not identify a brand on their own ("Bank Mandiri" is known as "Mandiri", not "Bank").
const GENERIC = new Set(["bank", "pt", "tbk", "persero", "group", "grup", "indonesia", "the", "and", "dan", "official", "company", "corp", "inc", "co", "ltd", "finance", "insurance", "asuransi", "syariah"]);

/** The brand's distinctive words: "Bank Mandiri" -> ["Mandiri"]; a one-word brand gives nothing extra. */
function distinctiveWords(brand) {
    const words = String(brand || "").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    if (words.length < 2) return [];
    return words.filter((w) => w.length >= 4 && !GENERIC.has(w.toLowerCase()));
}

/** The brand's names: the brand, its distinctive words and the keywords that spell it, longest first, no duplicates. */
export function brandAliases(brand, keywords = []) {
    if (!compact(brand)) return [];
    const out = new Map();
    for (const w of distinctiveWords(brand)) out.set(w.toLowerCase(), w);
    for (const k of [brand, ...keywords]) {
        const t = String(k || "").trim();
        if (t && isSpellingOf(t, brand) && !out.has(t.toLowerCase())) out.set(t.toLowerCase(), t);
    }
    return [...out.values()].sort((x, y) => y.length - x.length);
}

/** True when the keyword is one of the brand's own names (no brand mention needed beyond it). */
export function isBrandKeyword(keyword, aliases) {
    return !aliases.length || aliases.some((a) => isSpellingOf(keyword, a) || mentionsKeyword(keyword, a));
}

/** Search query for a keyword, scoped to the brand: `"Spektra" (FIFGROUP OR "FIF GROUP" OR FIF)`. */
export function scopedQuery(keyword, aliases) {
    const base = phraseQuery(keyword);
    if (isBrandKeyword(keyword, aliases)) return base;
    const names = aliases.slice(0, 4).map(phraseQuery);
    return names.length === 1 ? `${base} ${names[0]}` : `${base} (${names.join(" OR ")})`;
}

/**
 * True when the text belongs to this brand's conversation. The brand (or an alias) must be named: the search query
 * already asked for the keyword next to the brand, and news headlines often name only the brand ("FIFGROUP hadirkan
 * lima lini bisnis") while the article covers the keyword. Text naming the keyword but not the brand is someone
 * else's Spektra.
 */
export function isOnBrand(text, keyword, aliases) {
    // No brand set: nothing to scope by; each source keeps its own keyword filter.
    if (!aliases.length) return true;
    if (aliases.some((a) => mentionsKeyword(text, a))) return true;
    return Boolean(keyword) && isBrandKeyword(keyword, aliases) && mentionsKeyword(text, keyword);
}

/** The workspace's brand aliases (brand name from settings + its active keywords). */
export async function workspaceBrandAliases(workspaceId, db = supabaseAdmin) {
    // A PCVE workspace watches topics, not a brand: its keywords are read on their own.
    if ((await getWorkspaceProfile(workspaceId, db).catch(() => null))?.useCase === "cve") return [];
    // Only the brand name the workspace set: a workspace's own name can be anything ("Tim PR"), and no brand means
    // no scoping (each keyword is read on its own, as before).
    const [{ data: settings }, { data: kws }] = await Promise.all([
        db.from("workspace_settings").select("brand_name").eq("workspace_id", workspaceId).maybeSingle(),
        db.from("monitoring_keywords").select("keyword").eq("workspace_id", workspaceId).eq("is_active", true),
    ]);
    const brand = String(settings?.brand_name || "").toLowerCase() === "narriv" ? "" : settings?.brand_name || "";
    return brandAliases(brand, (kws || []).map((k) => k.keyword));
}
