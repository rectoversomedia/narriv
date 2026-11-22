/**
 * Keyword relevance for collected content. Sources such as YouTube search match loosely ("Kopi Senja" returns
 * any video about coffee or dusk), so a record is kept only when its own text names the keyword.
 */

const norm = (s) => String(s || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * True when `text` mentions `keyword` as a whole phrase, ignoring case, accents and punctuation. The keyword's words
 * written together also count, so "ArunikaPay", "Arunika Pay" and "#ArunikaPay" all match either spelling.
 */
export function mentionsKeyword(text, keyword) {
    const alts = keywordAlternatives(keyword);
    if (alts.length > 1) return alts.some((a) => mentionsKeyword(text, a));
    const k = norm(keyword);
    if (!k) return true;
    const tokens = norm(text).split(" ").filter(Boolean);
    if (` ${tokens.join(" ")} `.includes(` ${k} `)) return true;
    const compact = k.replace(/ /g, "");
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === compact) return true;
        if (i + 1 < tokens.length && tokens[i] + tokens[i + 1] === compact) return true;
    }
    return false;
}

/** The keyword as an exact-phrase search query: multi-word keywords are quoted so engines do not match any one word. */
export function phraseQuery(keyword) {
    const alts = keywordAlternatives(keyword);
    if (alts.length > 1) return `(${alts.map(phraseQuery).join(" OR ")})`;
    const k = String(keyword || "").replace(/"/g, "").trim().replace(/\s+/g, " ");
    return /\s/.test(k) ? `"${k}"` : k;
}

/**
 * A keyword can be a group of terms watched together: "radikalisme OR terorisme" (or "radikalisme | terorisme").
 * Used by topic workspaces (PCVE) whose watch list is longer than the number of keywords checked each run.
 */
export function keywordAlternatives(keyword) {
    return String(keyword || "").split(/\s+OR\s+|\s*\|\s*/).map((t) => t.trim()).filter(Boolean);
}
