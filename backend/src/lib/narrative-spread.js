/**
 * How a narrative spread, from the records linked to it. Everything here is read from those records; nothing is
 * estimated beyond them:
 *
 * - origin: the earliest record Narriv holds. It is the earliest Narriv collected, not proof of who posted first
 *   anywhere, and is labelled that way.
 * - amplifiers: the accounts and outlets with the most interactions (likes, replies, shares, reposts, quotes) and
 *   posts. In privacy mode social accounts are counted, never named (outlets keep their names, as in privacy.js).
 * - path: the order in which platforms picked the story up, with the delay from the origin.
 * - regions: provinces the records are ABOUT (read from their text) apart from where accounts SAY they are (the
 *   location label a platform gives). Neither is an IP address; platforms do not share those.
 * - clusters of near-identical text: several social accounts posting the same words within a short window
 *   (possible coordination), or several outlets running the same text (a shared press release). These are cues for
 *   a person to check, not findings.
 */
import { recordTime } from "./report-window.js";

const PUBLISHERS = new Set(["news", "web", "rss", "google_news"]);
const COORD_WINDOW_MIN = 120;
const COORD_MIN_AUTHORS = 3;
const SIMILAR = 0.8;
const MAX_COMPARE = 400;

const ms = (v) => (v ? new Date(v).getTime() : NaN);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Likes, replies, shares, reposts and quotes of one record (views are reach, kept apart). */
export function interactions(meta) {
    const e = meta?.engagement || {};
    return num(e.likes) + num(e.replies) + num(e.shares) + num(e.retweets) + num(e.quotes);
}

const views = (meta) => num(meta?.engagement?.views);

/** Words of a post without links, handles, hashtags' marks and punctuation, for near-duplicate checks. */
export function textTokens(text) {
    return new Set(String(text || "")
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, " ")
        .replace(/@[\w.•]+/g, " ")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2));
}

function jaccard(a, b) {
    if (!a.size || !b.size) return 0;
    let shared = 0;
    for (const w of a) if (b.has(w)) shared++;
    return shared / (a.size + b.size - shared);
}

/**
 * Groups of records with near-identical text from different authors. Social posts within COORD_WINDOW_MIN of each
 * other form "coordination" cues; outlets running the same text form "syndication".
 */
export function findTextClusters(rows) {
    const items = rows
        .filter((r) => r.author)
        .map((r) => ({ r, t: ms(recordTime(r)), tokens: textTokens(`${r.title || ""} ${r.content || ""}`) }))
        .filter((x) => Number.isFinite(x.t) && x.tokens.size >= 6)
        .sort((a, b) => a.t - b.t)
        .slice(0, MAX_COMPARE);
    const used = new Set();
    const groups = [];
    for (let i = 0; i < items.length; i++) {
        if (used.has(i)) continue;
        const seed = items[i];
        const publisher = PUBLISHERS.has(String(seed.r.platform || "").toLowerCase());
        const members = [i];
        for (let j = i + 1; j < items.length; j++) {
            if (used.has(j)) continue;
            const other = items[j];
            if (PUBLISHERS.has(String(other.r.platform || "").toLowerCase()) !== publisher) continue;
            if (!publisher && other.t - seed.t > COORD_WINDOW_MIN * 60000) break;
            if (jaccard(seed.tokens, other.tokens) >= SIMILAR) members.push(j);
        }
        const authors = new Set(members.map((k) => String(items[k].r.author).toLowerCase()));
        if (authors.size < COORD_MIN_AUTHORS) continue;
        members.forEach((k) => used.add(k));
        const times = members.map((k) => items[k].t);
        groups.push({
            kind: publisher ? "syndication" : "coordination",
            records: members.length,
            authors: authors.size,
            platforms: [...new Set(members.map((k) => items[k].r.platform).filter(Boolean))],
            firstAt: new Date(Math.min(...times)).toISOString(),
            spanMinutes: Math.round((Math.max(...times) - Math.min(...times)) / 60000),
            sample: String(seed.r.title || seed.r.content || "").slice(0, 220),
            accounts: [...authors].slice(0, 6),
        });
    }
    return groups.sort((a, b) => b.authors - a.authors).slice(0, 5);
}

const count = (map, key, by = 1) => map.set(key, (map.get(key) || 0) + by);
const ranked = (map, limit = 8) => [...map.entries()].map(([name, n]) => ({ name, count: n })).sort((a, b) => b.count - a.count).slice(0, limit);

const isPublisher = (r) => PUBLISHERS.has(String(r?.platform || "").toLowerCase());

/**
 * The spread of one narrative from its linked records (unmasked rows from `signals`). With `privacy`, the analysis
 * still runs on every record, and only the output leaves out social account names, handles and links.
 */
export function buildSpread(rows, { privacy = false } = {}) {
    const hide = (r) => privacy && !isPublisher(r);
    const timed = (rows || [])
        .map((r) => ({ r, t: ms(recordTime(r)) }))
        .filter((x) => Number.isFinite(x.t))
        .sort((a, b) => a.t - b.t);
    if (!timed.length) return null;

    const first = timed[0];
    const originAt = first.t;
    const origin = {
        id: first.r.id,
        author: hide(first.r) ? null : first.r.author || null,
        hidden: hide(first.r),
        platform: first.r.platform || null,
        title: hide(first.r) ? null : first.r.title || String(first.r.content || "").slice(0, 160),
        url: hide(first.r) ? null : first.r.url || null,
        at: new Date(originAt).toISOString(),
        timeBasis: first.r.published_at ? "published" : "collected",
        interactions: interactions(first.r.metadata),
    };

    // Amplifiers: named authors only; privacy-masked accounts are counted apart.
    const byAuthor = new Map();
    const hiddenAccounts = new Set();
    for (const { r, t } of timed) {
        if (!r.author) continue;
        if (hide(r)) { hiddenAccounts.add(String(r.author).trim().toLowerCase()); continue; }
        const key = String(r.author).trim().toLowerCase();
        const a = byAuthor.get(key) || { name: String(r.author).trim(), platforms: new Set(), posts: 0, interactions: 0, views: 0, firstAt: t, publisher: false };
        a.platforms.add(r.platform || "unknown");
        a.posts++;
        a.interactions += interactions(r.metadata);
        a.views += views(r.metadata);
        a.firstAt = Math.min(a.firstAt, t);
        a.publisher ||= PUBLISHERS.has(String(r.platform || "").toLowerCase());
        byAuthor.set(key, a);
    }
    const amplifiers = [...byAuthor.values()]
        .sort((a, b) => b.interactions - a.interactions || b.posts - a.posts || a.firstAt - b.firstAt)
        .slice(0, 6)
        .map((a) => ({
            name: a.name,
            platforms: [...a.platforms],
            posts: a.posts,
            interactions: a.interactions,
            views: a.views,
            kind: a.publisher ? "outlet" : "account",
            firstAt: new Date(a.firstAt).toISOString(),
            hoursAfterOrigin: Math.round(((a.firstAt - originAt) / 3600000) * 10) / 10,
            isOrigin: a.firstAt === originAt && a.name === origin.author,
        }));

    // Path across platforms, in the order they picked it up.
    const byPlatform = new Map();
    for (const { r, t } of timed) {
        const key = r.platform || "unknown";
        const p = byPlatform.get(key) || { platform: key, firstAt: t, records: 0, interactions: 0 };
        p.records++;
        p.interactions += interactions(r.metadata);
        byPlatform.set(key, p);
    }
    const path = [...byPlatform.values()]
        .sort((a, b) => a.firstAt - b.firstAt)
        .map((p) => ({ ...p, firstAt: new Date(p.firstAt).toISOString(), hoursAfterOrigin: Math.round(((p.firstAt - originAt) / 3600000) * 10) / 10 }));

    // Regions: what records are about vs. where accounts say they are.
    const about = new Map(), from = new Map();
    let unplaced = 0;
    for (const { r } of timed) {
        const geo = r.metadata?.geo;
        const provinces = geo?.source === "text" ? geo.provinces || [] : [];
        provinces.forEach((p) => count(about, p));
        const declared = r.metadata?.account_location?.province || (geo?.source === "location" ? geo.provinces?.[0] : null);
        if (declared) count(from, declared);
        if (!provinces.length && !declared) unplaced++;
    }

    return {
        records: timed.length,
        origin,
        amplifiers,
        hiddenAccounts: hiddenAccounts.size,
        path,
        regions: { about: ranked(about), from: ranked(from), unplaced },
        textClusters: findTextClusters(timed.map((x) => x.r)).map((g) => (privacy && g.kind === "coordination" ? { ...g, accounts: [], sample: null } : g)),
        spanHours: Math.round(((timed[timed.length - 1].t - originAt) / 3600000) * 10) / 10,
    };
}
