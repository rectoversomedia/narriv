/**
 * Conversation network: who talks to whom about the workspace's subject, built from account-level comments
 * (YouTube comments and replies). Rule-based and explainable, no AI call:
 *   - camps: groups of accounts that gather around the same videos and reply to each other (label propagation);
 *   - influential accounts: replies received weigh most, then likes, then how much they post;
 *   - coordination indications: the same text posted by several accounts close together, and accounts posting
 *     at a pace few people do. These are indications with their evidence, never a verdict.
 */

const POS = ["bagus", "mantap", "keren", "terima kasih", "makasih", "puas", "membantu", "mudah", "cepat", "suka", "top", "recommended", "rekomen", "aman", "hebat", "sukses", "semoga", "amin", "good", "great", "nice", "love", "best", "berhasil", "lancar"];
const NEG = ["jelek", "buruk", "kecewa", "lambat", "lemot", "error", "gagal", "penipuan", "tipu", "scam", "bohong", "rugi", "parah", "susah", "ribet", "mahal", "hilang", "kebobolan", "dibobol", "korupsi", "zalim", "bangsat", "anjing", "tolol", "bodoh", "hapus", "boikot", "ga bisa", "gak bisa", "tidak bisa", "nggak bisa", "pungli", "bad", "worst"];

const has = (text, word) => new RegExp(`(^|[^\\p{L}])${word.replace(/ /g, "\\s+")}([^\\p{L}]|$)`, "iu").test(text);

/** positive | negative | neutral, from a small Indonesian/English word list (comments are short and informal). */
export function commentSentiment(text) {
    const t = String(text || "").toLowerCase();
    const p = POS.filter((w) => has(t, w)).length;
    const n = NEG.filter((w) => has(t, w)).length;
    if (n > p) return "negative";
    if (p > n) return "positive";
    return "neutral";
}

export function normalizeText(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, " ")
        .replace(/@\S+/g, " ")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function labelPropagation(adjacency, rounds = 12) {
    const label = new Map([...adjacency.keys()].map((k) => [k, k]));
    const keys = [...adjacency.keys()].sort();
    for (let r = 0; r < rounds; r++) {
        let changed = false;
        for (const k of keys) {
            const counts = new Map();
            for (const [nb, w] of adjacency.get(k)) counts.set(label.get(nb), (counts.get(label.get(nb)) || 0) + w);
            if (!counts.size) continue;
            const best = [...counts].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0][0];
            if (best !== label.get(k)) { label.set(k, best); changed = true; }
        }
        if (!changed) break;
    }
    return label;
}

/**
 * @param comments comment rows (author, reply target, text, likes, time, sentiment, signal_id)
 * @param videos   signals the comments sit under: { id, title, author, url }
 */
export function buildNetwork(comments, videos = [], { maxNodes = 140 } = {}) {
    const videoById = new Map(videos.map((v) => [v.id, v]));
    const accounts = new Map();
    const acc = (id, name) => {
        if (!accounts.has(id)) accounts.set(id, { id, name: name || id, comments: 0, likes: 0, repliesReceived: 0, positive: 0, negative: 0, neutral: 0, videos: new Set(), first: null, last: null, best: null });
        return accounts.get(id);
    };
    const adjacency = new Map();
    const link = (a, b, w = 1) => {
        if (a === b) return;
        if (!adjacency.has(a)) adjacency.set(a, new Map());
        if (!adjacency.has(b)) adjacency.set(b, new Map());
        adjacency.get(a).set(b, (adjacency.get(a).get(b) || 0) + w);
        adjacency.get(b).set(a, (adjacency.get(b).get(a) || 0) + w);
    };
    const replyEdges = new Map();

    for (const c of comments) {
        if (!c.author_id) continue;
        const a = acc(c.author_id, c.author_name);
        a.comments++;
        a.likes += c.like_count || 0;
        if (!a.best || (c.like_count || 0) > (a.best.like_count || 0)) a.best = c;
        a[c.sentiment || "neutral"] = (a[c.sentiment || "neutral"] || 0) + 1;
        if (c.signal_id) { a.videos.add(c.signal_id); link(`acc:${c.author_id}`, `vid:${c.signal_id}`, 1); }
        if (c.published_at) {
            if (!a.first || c.published_at < a.first) a.first = c.published_at;
            if (!a.last || c.published_at > a.last) a.last = c.published_at;
        }
        if (c.reply_to_author_id && c.reply_to_author_id !== c.author_id) {
            acc(c.reply_to_author_id, c.reply_to_author_name).repliesReceived++;
            link(`acc:${c.author_id}`, `acc:${c.reply_to_author_id}`, 3);
            const key = `${c.author_id}→${c.reply_to_author_id}`;
            replyEdges.set(key, (replyEdges.get(key) || 0) + 1);
        }
    }

    const influence = (a) => a.repliesReceived * 3 + a.likes + a.comments;
    const label = labelPropagation(adjacency);
    // Camps are anchored on videos: an account belongs to the camp of the video it commented on most, so a camp
    // always has a "where" (reply threads alone used to split off as camps without a video).
    const perVideo = new Map();
    for (const c of comments) {
        if (!c.author_id || !c.signal_id) continue;
        const m = perVideo.get(c.author_id) || new Map();
        m.set(c.signal_id, (m.get(c.signal_id) || 0) + 1);
        perVideo.set(c.author_id, m);
    }
    for (const [author, m] of perVideo) {
        const top = [...m].sort((a, b) => b[1] - a[1])[0]?.[0];
        if (top && label.has(`vid:${top}`)) label.set(`acc:${author}`, label.get(`vid:${top}`));
    }

    // Camps: accounts sharing a label, with the videos in that label as their "where".
    const camps = new Map();
    for (const [node, l] of label) {
        if (!camps.has(l)) camps.set(l, { accounts: [], videos: [] });
        if (node.startsWith("acc:")) camps.get(l).accounts.push(accounts.get(node.slice(4)));
        else camps.get(l).videos.push(node.slice(4));
    }
    const campList = [...camps.values()]
        .filter((c) => c.accounts.length >= 2)
        .map((c) => {
            const pos = c.accounts.reduce((s, a) => s + a.positive, 0);
            const neg = c.accounts.reduce((s, a) => s + a.negative, 0);
            const total = c.accounts.reduce((s, a) => s + a.comments, 0) || 1;
            const tone = neg / total >= 0.3 && neg > pos ? "negative" : pos / total >= 0.3 && pos > neg ? "positive" : neg && pos ? "mixed" : "neutral";
            const top = [...c.accounts].sort((x, y) => influence(y) - influence(x));
            const samples = c.accounts.map((a) => a.best).filter((b) => b?.text).sort((x, y) => (y.like_count || 0) - (x.like_count || 0)).slice(0, 6).map((b) => b.text);
            const videoIds = [...c.videos].sort();
            return {
                key: videoIds.join("|"),
                samples,
                size: c.accounts.length,
                comments: total,
                tone,
                negativeShare: Math.round((neg / total) * 100),
                positiveShare: Math.round((pos / total) * 100),
                topAccounts: top.slice(0, 5).map((a) => a.name),
                videos: c.videos.map((id) => videoById.get(id)).filter(Boolean).slice(0, 3).map((v) => ({ id: v.id, title: v.title, channel: v.author, url: v.url })),
                members: new Set(c.accounts.map((a) => a.id)),
            };
        })
        .sort((a, b) => b.comments - a.comments)
        .slice(0, 8)
        .map((c, i) => ({ ...c, id: i + 1 }));
    const campOf = new Map();
    for (const c of campList) for (const m of c.members) campOf.set(m, c.id);

    const ranked = [...accounts.values()].sort((x, y) => influence(y) - influence(x));
    // The map shows the camps; accounts outside them stay counted in the stats and lists, not drawn as grey noise.
    const shown = ranked.filter((a) => campOf.has(a.id)).slice(0, maxNodes);
    const shownIds = new Set(shown.map((a) => a.id));
    const shownVideos = new Set(shown.flatMap((a) => [...a.videos]));

    const nodes = [
        ...shown.map((a) => ({
            id: `acc:${a.id}`, kind: "account", label: a.name, camp: campOf.get(a.id) ?? null,
            weight: influence(a), comments: a.comments, likes: a.likes, repliesReceived: a.repliesReceived,
            tone: a.negative > a.positive ? "negative" : a.positive > a.negative ? "positive" : "neutral",
        })),
        ...[...shownVideos].map((id) => videoById.get(id)).filter(Boolean).map((v) => ({ id: `vid:${v.id}`, kind: "video", label: v.title, channel: v.author, url: v.url, camp: null, weight: 0 })),
    ];
    const edges = [];
    for (const a of shown) for (const v of a.videos) if (videoById.has(v)) edges.push({ source: `acc:${a.id}`, target: `vid:${v}`, kind: "comment", weight: 1 });
    for (const [key, w] of replyEdges) {
        const [from, to] = key.split("→");
        if (shownIds.has(from) && shownIds.has(to)) edges.push({ source: `acc:${from}`, target: `acc:${to}`, kind: "reply", weight: w });
    }

    const byAuthor = new Map();
    for (const c of comments) if (c.author_id) (byAuthor.get(c.author_id) || byAuthor.set(c.author_id, []).get(c.author_id)).push(c);
    const topAccounts = ranked.slice(0, 10).map((a) => ({
        id: a.id, name: a.name, comments: a.comments, likes: a.likes, repliesReceived: a.repliesReceived, videos: a.videos.size, camp: campOf.get(a.id) ?? null,
        // YouTube channel ids start with "UC"; other ids (demo, handles) have no public page to link.
        url: /^UC[\w-]{20,}$/.test(String(a.id)) ? `https://www.youtube.com/channel/${a.id}` : null,
        // What they actually said: their most liked comments, with the video they sit under.
        samples: (byAuthor.get(a.id) || []).sort((x, y) => (y.like_count || 0) - (x.like_count || 0)).slice(0, 3)
            .map((c) => ({ text: String(c.text || "").slice(0, 240), likes: c.like_count || 0, tone: c.sentiment || "neutral", video: videoById.get(c.signal_id)?.title || null, at: c.published_at || null })),
        role: a.repliesReceived >= 3 ? "trigger" : a.comments >= 5 ? "amplifier" : a.likes >= 50 ? "voice" : "participant",
        tone: a.negative > a.positive ? "negative" : a.positive > a.negative ? "positive" : "neutral",
    }));

    return {
        stats: { accounts: accounts.size, comments: comments.length, replies: [...replyEdges.values()].reduce((s, w) => s + w, 0), videos: new Set(comments.map((c) => c.signal_id).filter(Boolean)).size },
        nodes,
        edges,
        camps: campList.map(({ members, ...c }) => c),
        topAccounts,
        coordination: detectCoordination(comments),
    };
}

/**
 * Indications of coordinated posting:
 *   same_text — one (normalized) text of 20+ characters posted by 3+ accounts within 6 hours;
 *   burst     — one account posting 6+ comments across 3+ videos within 24 hours.
 */
export function detectCoordination(comments, { minAccounts = 3, windowHours = 6 } = {}) {
    const out = [];
    const byText = new Map();
    for (const c of comments) {
        const n = normalizeText(c.text);
        if (n.length < 20 || !c.author_id) continue;
        if (!byText.has(n)) byText.set(n, []);
        byText.get(n).push(c);
    }
    for (const [, group] of byText) {
        const sorted = [...group].sort((a, b) => String(a.published_at).localeCompare(String(b.published_at)));
        const authors = new Set(sorted.map((c) => c.author_id));
        if (authors.size < minAccounts) continue;
        const span = (Date.parse(sorted.at(-1).published_at) - Date.parse(sorted[0].published_at)) / 3600000;
        if (!(span <= windowHours)) continue;
        out.push({
            kind: "same_text",
            text: sorted[0].text.slice(0, 220),
            accounts: [...new Set(sorted.map((c) => c.author_name || c.author_id))].slice(0, 12),
            accountCount: authors.size,
            posts: sorted.length,
            spanMinutes: Math.round(span * 60),
            firstAt: sorted[0].published_at,
            videos: new Set(sorted.map((c) => c.signal_id)).size,
        });
    }
    const byAuthor = new Map();
    for (const c of comments) {
        if (!c.author_id || !c.published_at) continue;
        if (!byAuthor.has(c.author_id)) byAuthor.set(c.author_id, []);
        byAuthor.get(c.author_id).push(c);
    }
    for (const [, list] of byAuthor) {
        const sorted = [...list].sort((a, b) => String(a.published_at).localeCompare(String(b.published_at)));
        for (let i = 0; i < sorted.length; i++) {
            const end = Date.parse(sorted[i].published_at) + 86400000;
            const windowed = sorted.filter((c, j) => j >= i && Date.parse(c.published_at) <= end);
            const vids = new Set(windowed.map((c) => c.signal_id));
            if (windowed.length >= 6 && vids.size >= 3) {
                out.push({ kind: "burst", account: sorted[i].author_name || sorted[i].author_id, posts: windowed.length, videos: vids.size, firstAt: windowed[0].published_at, text: windowed[0].text.slice(0, 160) });
                break;
            }
        }
    }
    return out.sort((a, b) => (b.accountCount || 1) * (b.posts || 1) - (a.accountCount || 1) * (a.posts || 1)).slice(0, 10);
}
