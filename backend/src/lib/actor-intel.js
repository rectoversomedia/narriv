/**
 * Account intelligence for investigators (PCVE and government workspaces): who posts, who started a story, who
 * amplified it, which accounts behave like automation, and which accounts move together.
 *
 * Everything here is an INDICATION computed from what Narriv collected, never a finding:
 *  - "origin" is the earliest record Narriv holds, not proof of who posted first anywhere;
 *  - the automation score adds up observable signs (account age, follow ratio, default avatar, same text as other
 *    accounts minutes apart, posting pace, night posting); real accounts can show some of them;
 *  - affiliation groups accounts that repost each other or post the same text together; it says nothing about
 *    membership of any organisation.
 * Account profiles (age, followers, history) come from a stored roster when one exists (the demo, or a future
 * collector); without one the score uses posting behaviour only and says so (`limited`).
 */

const H = 3600000;
const PUBLISHERS = new Set(["news", "web", "rss", "google_news"]);

export const norm = (t) => String(t || "").toLowerCase().replace(/https?:\S+/g, "").replace(/[^\p{L}\p{N} ]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 140);
export const accountId = (s) => `${s.platform || "web"}:${s.author || "?"}`;
const ts = (s) => Date.parse(s.published_at || s.captured_at);

/** Same text from 3+ accounts inside `windowMin` minutes. */
export function coordinationBursts(signals, { windowMin = 60, minAccounts = 3 } = {}) {
    const byText = new Map();
    for (const s of signals) {
        if (PUBLISHERS.has(s.platform) || !s.author) continue;
        const k = norm(s.title || s.content);
        if (k.length < 20) continue;
        (byText.get(k) || byText.set(k, []).get(k)).push(s);
    }
    const out = [];
    for (const [text, list] of byText) {
        list.sort((a, b) => ts(a) - ts(b));
        let i = 0;
        while (i < list.length) {
            let j = i;
            while (j + 1 < list.length && ts(list[j + 1]) - ts(list[j]) <= windowMin * 60000) j++;
            const part = list.slice(i, j + 1);
            const accounts = [...new Set(part.map(accountId))];
            if (accounts.length >= minAccounts) {
                out.push({ text: part[0].title || text, accounts, posts: part.length, signalIds: part.map((p) => p.id), firstAt: new Date(ts(part[0])).toISOString(), lastAt: new Date(ts(part.at(-1))).toISOString(), spanMinutes: Math.round((ts(part.at(-1)) - ts(part[0])) / 60000) });
            }
            i = j + 1;
        }
    }
    return out.sort((a, b) => b.accounts.length - a.accounts.length);
}

/** Automation indication, 0–100, with the reasons that added up to it. */
export function automationScore(acc, { burstPosts = 0 } = {}) {
    if (acc.publisher) return { score: 0, level: "publisher", reasons: [], limited: false };
    const reasons = [];
    let score = 0;
    const add = (pts, text) => { score += pts; reasons.push({ points: pts, text }); };
    const p = acc.profile;
    if (p?.createdAt) {
        const days = (Date.now() - Date.parse(p.createdAt)) / 86400000;
        if (days < 14) add(30, `Akun baru dibuat ${Math.max(1, Math.round(days))} hari lalu`);
        else if (days < 45) add(18, `Akun relatif baru (${Math.round(days)} hari)`);
    }
    if (p && Number.isFinite(p.followers) && Number.isFinite(p.following) && p.following > 0) {
        if (p.followers < 100 && p.following > 5 * Math.max(p.followers, 1)) add(15, `Mengikuti ${p.following} akun tapi hanya diikuti ${p.followers}`);
    }
    if (p?.defaultAvatar) add(8, "Memakai foto profil bawaan");
    if (/\d{4,}/.test(acc.handle || "")) add(7, "Nama akun berakhiran deret angka acak");
    const share = acc.posts.length ? burstPosts / acc.posts.length : 0;
    if (burstPosts >= 1 && share >= 0.5) add(22, `${burstPosts} dari ${acc.posts.length} unggahan berteks sama dengan akun lain, berselang menit`);
    else if (burstPosts >= 1) add(10, `${burstPosts} unggahan berteks sama dengan akun lain`);
    // Fastest pace: most posts inside any one hour.
    const times = acc.posts.map(ts).sort((a, b) => a - b);
    let pace = 0;
    for (let i = 0, j = 0; i < times.length; i++) { while (times[i] - times[j] > H) j++; pace = Math.max(pace, i - j + 1); }
    if (pace >= 4) add(12, `${pace} unggahan dalam satu jam`);
    const night = times.filter((t) => { const h = new Date(t + 7 * H).getUTCHours(); return h >= 1 && h < 5; }).length;
    if (times.length >= 3 && night / times.length > 0.5) add(5, "Sebagian besar unggahan pukul 01.00–05.00 WIB");
    score = Math.min(100, score);
    return { score, level: score >= 60 ? "high" : score >= 35 ? "medium" : "low", reasons, limited: !p, pace };
}

/**
 * Accounts with their posts, profile, score and links. `roster` = { actors: [...], clusters: [...] } or null.
 * `narrativeOf` maps a signal id to { id, title, key }.
 */
export function buildAccounts(signals, roster, narrativeOf = new Map()) {
    const profiles = new Map((roster?.actors || []).map((a) => [a.id, a]));
    const byHandle = new Map((roster?.actors || []).map((a) => [a.handle, a.id]));
    const accounts = new Map();
    for (const s of signals) {
        if (!s.author) continue;
        const id = s.metadata?.account || accountId(s);
        let a = accounts.get(id);
        if (!a) {
            const p = profiles.get(id) || null;
            a = { id, handle: s.author, platform: s.platform, publisher: PUBLISHERS.has(s.platform), profile: p, posts: [], narratives: new Map(), categories: {}, ideologies: {}, cities: {}, provinces: {}, escalations: [], repostsOf: {}, repostedBy: {} };
            accounts.set(id, a);
        }
        a.posts.push(s);
        const n = narrativeOf.get(s.id);
        if (n) a.narratives.set(n.id, n);
        const cve = s.metadata?.cve;
        if (cve?.category && cve.category !== "none") a.categories[cve.category] = (a.categories[cve.category] || 0) + 1;
        if (cve?.ideology) a.ideologies[cve.ideology] = (a.ideologies[cve.ideology] || 0) + 1;
        for (const e of s.metadata?.escalations || []) a.escalations.push({ ...e, signalId: s.id, title: s.title });
        const city = s.metadata?.geo?.cities?.[0];
        if (city) a.cities[city] = (a.cities[city] || 0) + 1;
        if (s.region) a.provinces[s.region] = (a.provinces[s.region] || 0) + 1;
        const to = s.metadata?.repost_of;
        if (to) {
            const target = byHandle.get(to) || [...accounts.values()].find((x) => x.handle === to)?.id || `${s.platform}:${to}`;
            a.repostsOf[target] = (a.repostsOf[target] || 0) + 1;
        }
    }
    for (const a of accounts.values()) for (const [t, n] of Object.entries(a.repostsOf)) { const b = accounts.get(t); if (b) b.repostedBy[a.id] = (b.repostedBy[a.id] || 0) + n; }

    const bursts = coordinationBursts(signals);
    const burstPosts = new Map();
    const burstIds = new Set(bursts.flatMap((b) => b.signalIds));
    for (const a of accounts.values()) burstPosts.set(a.id, a.posts.filter((p) => burstIds.has(p.id)).length);
    for (const a of accounts.values()) {
        a.posts.sort((x, y) => ts(x) - ts(y));
        a.firstAt = a.posts[0] ? new Date(ts(a.posts[0])).toISOString() : null;
        a.lastAt = a.posts.at(-1) ? new Date(ts(a.posts.at(-1))).toISOString() : null;
        a.automation = automationScore(a, { burstPosts: burstPosts.get(a.id) || 0 });
        a.riskPosts = a.posts.filter((p) => p.metadata?.cve?.category && !["none", "counter_narrative"].includes(p.metadata.cve.category)).length;
        a.counterPosts = a.posts.filter((p) => p.metadata?.cve?.category === "counter_narrative").length;
        a.reach = Object.values(a.repostedBy).reduce((n, x) => n + x, 0);
    }
    return { accounts, bursts };
}

/** Affiliation groups and the edges between accounts. */
export function affiliations(accounts, bursts, roster) {
    const edges = new Map();
    const link = (a, b, kind, w = 1) => {
        if (a === b || !accounts.has(a) || !accounts.has(b)) return;
        const k = a < b ? `${a}|${b}` : `${b}|${a}`;
        const e = edges.get(k) || { source: a < b ? a : b, target: a < b ? b : a, weight: 0, kinds: new Set() };
        e.weight += w; e.kinds.add(kind); edges.set(k, e);
    };
    for (const a of accounts.values()) for (const [t, n] of Object.entries(a.repostsOf)) link(a.id, t, "repost", n);
    for (const b of bursts) for (let i = 1; i < b.accounts.length; i++) link(b.accounts[0], b.accounts[i], "same_text", 1);

    // Groups: the roster's clusters when present, else connected parts of the graph with 3+ accounts.
    const groupOf = new Map();
    let groups = [];
    const known = roster?.clusters || [];
    if (known.length) {
        for (const a of accounts.values()) {
            const c = a.profile?.cluster;
            if (c) groupOf.set(a.id, c);
        }
        groups = known.map((c) => ({ ...c }));
    } else {
        const parent = new Map();
        const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
        for (const id of accounts.keys()) parent.set(id, id);
        for (const e of edges.values()) parent.set(find(e.source), find(e.target));
        const parts = new Map();
        for (const id of accounts.keys()) { const r = find(id); (parts.get(r) || parts.set(r, []).get(r)).push(id); }
        let n = 0;
        for (const members of parts.values()) {
            if (members.length < 3) continue;
            const id = `g${++n}`;
            members.forEach((m) => groupOf.set(m, id));
            groups.push({ id, label: `Kelompok ${n}`, ideology: null, stance: null, summary: null });
        }
    }
    const out = groups.map((g) => {
        const members = [...accounts.values()].filter((a) => groupOf.get(a.id) === g.id);
        const bridges = [...accounts.values()].filter((a) => a.profile?.alsoIn?.includes(g.id)).map((a) => a.id);
        if (!members.length) return null;
        const posts = members.reduce((n, a) => n + a.posts.length, 0);
        const narratives = new Map();
        members.forEach((a) => a.narratives.forEach((v) => narratives.set(v.id, { ...v, n: (narratives.get(v.id)?.n || 0) + 1 })));
        const cities = {};
        members.forEach((a) => Object.entries(a.cities).forEach(([c, k]) => (cities[c] = (cities[c] || 0) + k)));
        const ideology = g.ideology ?? Object.entries(members.reduce((m, a) => { Object.entries(a.ideologies).forEach(([k, v]) => (m[k] = (m[k] || 0) + v)); return m; }, {})).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        const automated = members.filter((a) => a.automation.level === "high").length;
        const hub = [...members].sort((a, b) => b.reach - a.reach || b.posts.length - a.posts.length)[0];
        return { ...g, ideology, size: members.length, posts, automated, automatedShare: Math.round((automated / members.length) * 100), hub: hub?.id || null,
                 members: members.map((a) => a.id), bridges, narratives: [...narratives.values()].sort((a, b) => b.n - a.n).slice(0, 4), cities: Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([city, n]) => ({ city, n })) };
    }).filter(Boolean);
    return { groups: out, groupOf, edges: [...edges.values()].map((e) => ({ ...e, kinds: [...e.kinds] })) };
}

/** How one story started and spread. `list` = that story's records. */
export function originOf(list, accounts, bursts, groupOf) {
    const sorted = [...list].filter((s) => s.author).sort((a, b) => ts(a) - ts(b));
    if (!sorted.length) return null;
    const first = sorted[0];
    const t0 = ts(first);
    const originAcc = accounts.get(first.metadata?.account || accountId(first));
    const seen = new Set([originAcc?.id]);
    const amplifiers = [];
    for (const s of sorted.slice(1)) {
        if (ts(s) - t0 > 72 * H) break; // amplifiers act in the first three days
        const id = s.metadata?.account || accountId(s);
        if (seen.has(id)) continue;
        seen.add(id);
        const a = accounts.get(id);
        if (!a || a.publisher) continue;
        if (a.automation.level === "high") continue;
        amplifiers.push({ id, delayMinutes: Math.round((ts(s) - t0) / 60000), reach: a.reach, repostOfOrigin: s.metadata?.repost_of === first.author });
        if (amplifiers.length >= 6) break;
    }
    const cityFirst = new Map();
    for (const s of sorted) {
        const city = s.metadata?.geo?.cities?.[0] || s.region || "Tidak diketahui";
        const c = cityFirst.get(city) || { city, province: s.region || null, firstAt: new Date(ts(s)).toISOString(), posts: 0, claimed: s.metadata?.geo?.source === "claimed" };
        c.posts++; cityFirst.set(city, c);
    }
    const platforms = [];
    for (const s of sorted) if (!platforms.find((p) => p.platform === s.platform)) platforms.push({ platform: s.platform, delayMinutes: Math.round((ts(s) - t0) / 60000) });
    const ids = new Set(sorted.map((s) => s.id));
    const myBursts = bursts.filter((b) => b.signalIds.some((i) => ids.has(i)));
    const authorsOf = sorted.map((s) => accounts.get(s.metadata?.account || accountId(s))).filter(Boolean);
    const automatedPosts = authorsOf.filter((a) => a.automation.level === "high").length;
    const groupPosts = {};
    authorsOf.forEach((a) => { const g = groupOf.get(a.id) || "none"; groupPosts[g] = (groupPosts[g] || 0) + 1; });
    // Timeline: posts per 6 hours across the story's life.
    const span = Math.max(ts(sorted.at(-1)) - t0, 6 * H);
    const step = span > 10 * 86400000 ? 24 * H : 6 * H;
    const buckets = [];
    for (let t = t0; t <= ts(sorted.at(-1)); t += step) buckets.push({ at: new Date(t).toISOString(), posts: 0, automated: 0 });
    sorted.forEach((s, i) => { const b = buckets[Math.min(buckets.length - 1, Math.floor((ts(s) - t0) / step))]; b.posts++; if (authorsOf[i]?.automation.level === "high") b.automated++; });
    return {
        origin: { id: originAcc?.id || accountId(first), signalId: first.id, at: new Date(t0).toISOString(), title: first.title, platform: first.platform, city: first.metadata?.geo?.cities?.[0] || null, province: first.region || null, archiveId: first.metadata?.archive_id || null },
        amplifiers,
        cities: [...cityFirst.values()].sort((a, b) => a.firstAt.localeCompare(b.firstAt)),
        platforms,
        bursts: myBursts.map((b) => ({ ...b, signalIds: undefined })).slice(0, 6),
        posts: sorted.length,
        accounts: new Set(authorsOf.map((a) => a.id)).size,
        automatedShare: sorted.length ? Math.round((automatedPosts / sorted.length) * 100) : 0,
        groups: Object.entries(groupPosts).map(([id, posts]) => ({ id: id === "none" ? null : id, posts, share: Math.round((posts / sorted.length) * 100) })).sort((a, b) => b.posts - a.posts),
        timeline: buckets,
        stepHours: step / H,
        firstAt: new Date(t0).toISOString(),
        lastAt: new Date(ts(sorted.at(-1))).toISOString(),
    };
}
