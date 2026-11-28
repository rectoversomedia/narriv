/**
 * Investigasi: issue origin, account profiles, automation indications and affiliation networks
 * (lib/actor-intel.js). Read-only; everything is computed from the workspace's records on request.
 *
 * Identities: in privacy mode (PCVE workspaces) handles are shown only to the workspace's owner/admin and the
 * Narriv team, the people authorised to pass them on to an agency. Everyone else sees stable aliases
 * ("Akun 3F2A"); the structure (who started, who amplified, which accounts move together) stays readable.
 */
import express from "express";
import crypto from "node:crypto";
import supabase from "../../lib/supabase.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveWorkspaceIdForUser, getWorkspaceRole, MANAGER_ROLES } from "../../lib/workspace-access.js";
import { isPlatformAdmin } from "../../lib/platform-admin.js";
import { getWorkspaceProfile } from "../../lib/workspace-profile.js";
import { maskHandles } from "../../lib/privacy.js";
import { buildAccounts, affiliations, originOf } from "../../lib/actor-intel.js";
import { logStructured } from "../../lib/logger.js";

const router = express.Router();
router.use(verifyToken);

const DAYS = 90;

async function load(workspaceId) {
    const since = new Date(Date.now() - DAYS * 86400000).toISOString();
    const signals = [];
    for (let from = 0; from < 6000; from += 1000) {
        const { data, error } = await supabase.from("signals")
            .select("id, title, content, platform, author, published_at, captured_at, region, sentiment, severity, metadata")
            .eq("workspace_id", workspaceId).gte("captured_at", since).order("captured_at", { ascending: false }).range(from, from + 999);
        if (error) throw error;
        signals.push(...(data || []));
        if (!data || data.length < 1000) break;
    }
    const { data: clusters } = await supabase.from("narrative_clusters").select("id, title, metadata, signal_count, impact, lifecycle").eq("workspace_id", workspaceId).order("signal_count", { ascending: false }).limit(60);
    const narrativeOf = new Map();
    const ids = (clusters || []).map((c) => c.id);
    for (let i = 0; i < ids.length; i += 20) {
        const { data: links } = await supabase.from("narrative_cluster_signals").select("cluster_id, signal_id").in("cluster_id", ids.slice(i, i + 20)).limit(10000);
        for (const l of links || []) {
            const c = clusters.find((x) => x.id === l.cluster_id);
            if (c && !narrativeOf.has(l.signal_id)) narrativeOf.set(l.signal_id, { id: c.id, title: c.title, key: c.metadata?.key || null });
        }
    }
    const { data: rosterRows } = await supabase.from("raw_documents").select("metadata, created_at").eq("workspace_id", workspaceId).like("external_id", "actors:%").order("created_at", { ascending: false }).limit(1);
    const roster = rosterRows?.[0]?.metadata?.actors ? { actors: rosterRows[0].metadata.actors, clusters: rosterRows[0].metadata.clusters || [] } : null;
    const { accounts, bursts } = buildAccounts(signals, roster, narrativeOf);
    const aff = affiliations(accounts, bursts, roster);
    return { signals, clusters: clusters || [], narrativeOf, roster, accounts, bursts, ...aff };
}

async function identityFor(req, workspaceId) {
    const { privacyMode } = await getWorkspaceProfile(workspaceId);
    if (!privacyMode) return { masked: false, reason: null };
    if (await isPlatformAdmin(req.user.id)) return { masked: false, reason: "authorised" };
    const role = await getWorkspaceRole(req.user.id, workspaceId);
    return MANAGER_ROLES.includes(role) ? { masked: false, reason: "authorised" } : { masked: true, reason: "privacy" };
}

const alias = (id) => `Akun ${crypto.createHash("sha1").update(String(id)).digest("hex").slice(0, 4).toUpperCase()}`;
const aliasId = (id) => `m-${crypto.createHash("sha1").update(String(id)).digest("hex").slice(0, 10)}`;

function makeView(ctx, masked) {
    const hide = (a) => masked && a && !a.publisher;
    const idOf = (id) => { const a = ctx.accounts.get(id); return hide(a) ? aliasId(id) : id; };
    const nameOf = (id) => { const a = ctx.accounts.get(id); if (!a) return id; return hide(a) ? alias(id) : a.handle; };
    const text = (t) => (masked ? maskHandles(t) : t);
    const summary = (a) => ({
        id: idOf(a.id), handle: nameOf(a.id), name: hide(a) ? null : a.profile?.name || null, platform: a.platform, publisher: a.publisher, masked: hide(a),
        group: ctx.groupOf.get(a.id) || null, alsoIn: a.profile?.alsoIn || [],
        automation: a.automation, posts: a.posts.length, riskPosts: a.riskPosts, counterPosts: a.counterPosts, reach: a.reach, escalations: a.escalations.length,
        firstAt: a.firstAt, lastAt: a.lastAt,
        city: Object.entries(a.cities).sort((x, y) => y[1] - x[1])[0]?.[0] || a.profile?.city || null,
        province: a.profile?.province || Object.entries(a.provinces).sort((x, y) => y[1] - x[1])[0]?.[0] || null,
        locationClaimed: !!a.profile?.locationClaimed,
        categories: a.categories, ideologies: a.ideologies,
        narratives: [...a.narratives.values()].map((n) => ({ id: n.id, title: n.title })),
    });
    return { idOf, nameOf, text, summary, hide };
}

async function context(req, res) {
    const workspaceId = await resolveWorkspaceIdForUser(req.user.id);
    if (!workspaceId) { res.status(404).json({ error: "No workspace" }); return null; }
    const [ctx, identity] = await Promise.all([load(workspaceId), identityFor(req, workspaceId)]);
    return { ctx, identity, view: makeView(ctx, identity.masked) };
}

const riskOrder = (a) => a.automation.score * 0.4 + a.riskPosts * 3 + a.reach * 2 + a.escalations.length * 5;

// GET /investigations/overview: stories with their origin, the affiliation groups and the accounts to look at.
router.get("/overview", async (req, res, next) => {
    try {
        const c = await context(req, res);
        if (!c) return;
        const { ctx, identity, view } = c;
        const stories = ctx.clusters.map((cl) => {
            const list = ctx.signals.filter((s) => ctx.narrativeOf.get(s.id)?.id === cl.id);
            const o = originOf(list, ctx.accounts, ctx.bursts, ctx.groupOf);
            if (!o) return null;
            const cats = {};
            list.forEach((s) => { const k = s.metadata?.cve?.category; if (k) cats[k] = (cats[k] || 0) + 1; });
            const category = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
            return { id: cl.id, title: cl.title, category, legitimate: category === "none", impact: cl.impact, lifecycle: cl.lifecycle, posts: o.posts, accounts: o.accounts, automatedShare: o.automatedShare,
                     origin: { ...o.origin, id: view.idOf(o.origin.id), handle: view.nameOf(o.origin.id), title: view.text(o.origin.title) }, firstAt: o.firstAt, lastAt: o.lastAt,
                     cities: o.cities.length, bursts: o.bursts.length, mainGroup: o.groups.find((g) => g.id)?.id || null };
        }).filter(Boolean);
        const people = [...ctx.accounts.values()].filter((a) => !a.publisher);
        const accounts = people.sort((a, b) => riskOrder(b) - riskOrder(a)).slice(0, 120).map(view.summary);
        res.json({
            identity, days: DAYS, limitedProfiles: !ctx.roster,
            stats: { accounts: people.length, automatedHigh: people.filter((a) => a.automation.level === "high").length, automatedMedium: people.filter((a) => a.automation.level === "medium").length, bursts: ctx.bursts.length, groups: ctx.groups.length, stories: stories.length },
            stories, groups: ctx.groups.map((g) => ({ ...g, members: undefined, size: g.size, hub: g.hub ? view.idOf(g.hub) : null, hubName: g.hub ? view.nameOf(g.hub) : null, bridges: g.bridges.map(view.nameOf) })),
            accounts,
        });
    } catch (err) { next(err); }
});

// GET /investigations/stories/:id: how one story started and spread.
router.get("/stories/:id", async (req, res, next) => {
    try {
        const c = await context(req, res);
        if (!c) return;
        const { ctx, identity, view } = c;
        const cl = ctx.clusters.find((x) => x.id === req.params.id);
        if (!cl) return res.status(404).json({ error: "Story not found" });
        const list = ctx.signals.filter((s) => ctx.narrativeOf.get(s.id)?.id === cl.id);
        const o = originOf(list, ctx.accounts, ctx.bursts, ctx.groupOf);
        if (!o) return res.status(404).json({ error: "No records" });
        const cats = {};
        list.forEach((s) => { const k = s.metadata?.cve?.category; if (k) cats[k] = (cats[k] || 0) + 1; });
        const category = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        const originAcc = ctx.accounts.get(o.origin.id);
        const firstPost = list.find((s) => s.id === o.origin.signalId);
        const keyAccounts = [...new Set(list.map((s) => s.metadata?.account || `${s.platform}:${s.author}`))].map((id) => ctx.accounts.get(id)).filter((a) => a && !a.publisher)
            .sort((a, b) => riskOrder(b) - riskOrder(a)).slice(0, 12).map(view.summary);
        const escalations = list.flatMap((s) => (s.metadata?.escalations || []).map((e) => ({ target: e.target, at: e.at, title: view.text(s.title) })));
        res.json({
            identity,
            story: { id: cl.id, title: cl.title, summary: cl.metadata?.summary || null, category, legitimate: category === "none", impact: cl.impact, lifecycle: cl.lifecycle },
            origin: { ...o.origin, id: view.idOf(o.origin.id), handle: view.nameOf(o.origin.id), title: view.text(o.origin.title), content: view.text(firstPost?.content || null), account: originAcc ? view.summary(originAcc) : null },
            amplifiers: o.amplifiers.map((a) => ({ ...view.summary(ctx.accounts.get(a.id)), delayMinutes: a.delayMinutes, repostOfOrigin: a.repostOfOrigin })),
            cities: o.cities, platforms: o.platforms,
            bursts: o.bursts.map((b) => ({ ...b, text: view.text(b.text), accounts: b.accounts.map(view.nameOf), accountIds: b.accounts.map(view.idOf) })),
            posts: o.posts, accounts: o.accounts, automatedShare: o.automatedShare,
            groups: o.groups.map((g) => ({ ...g, label: ctx.groups.find((x) => x.id === g.id)?.label || null })),
            timeline: o.timeline, stepHours: o.stepHours, firstAt: o.firstAt, lastAt: o.lastAt,
            keyAccounts, escalations,
            evidence: list.slice().sort((a, b) => (a.published_at || "").localeCompare(b.published_at || "")).slice(0, 40).map((s) => ({
                id: s.id, at: s.published_at || s.captured_at, title: view.text(s.title), platform: s.platform, account: view.nameOf(s.metadata?.account || `${s.platform}:${s.author}`), accountId: view.idOf(s.metadata?.account || `${s.platform}:${s.author}`),
                city: s.metadata?.geo?.cities?.[0] || null, province: s.region || null, archiveId: s.metadata?.archive_id || null, category: s.metadata?.cve?.category || null })),
        });
    } catch (err) { next(err); }
});

// GET /investigations/accounts/:id: one account's profile, automation signs, history and connections.
router.get("/accounts/:id", async (req, res, next) => {
    try {
        const c = await context(req, res);
        if (!c) return;
        const { ctx, identity, view } = c;
        const wanted = String(req.params.id);
        const a = ctx.accounts.get(wanted) || [...ctx.accounts.values()].find((x) => view.idOf(x.id) === wanted);
        if (!a || (identity.masked && !a.publisher && wanted === a.id)) return res.status(404).json({ error: "Account not found" });
        const connections = ctx.edges.filter((e) => e.source === a.id || e.target === a.id).map((e) => {
            const other = e.source === a.id ? e.target : e.source;
            const o = ctx.accounts.get(other);
            return { id: view.idOf(other), handle: view.nameOf(other), group: ctx.groupOf.get(other) || null, weight: e.weight, kinds: e.kinds, automation: o?.automation.level || null, direction: a.repostsOf[other] ? "reposts" : a.repostedBy[other] ? "reposted_by" : "same_text" };
        }).sort((x, y) => y.weight - x.weight).slice(0, 20);
        const p = a.profile;
        const history = [
            ...(p?.history || []).map((h) => ({ at: h.at, text: view.text(h.text), kind: "profile" })),
            ...(p?.createdAt ? [{ at: p.createdAt, text: "Akun dibuat", kind: "created" }] : []),
            ...(a.firstAt ? [{ at: a.firstAt, text: "Unggahan pertama yang tercatat Narriv", kind: "first_seen" }] : []),
            ...a.escalations.map((e) => ({ at: e.at, text: `Dieskalasi ke ${({ bnpt: "BNPT", komdigi: "Komdigi (takedown)", polri: "Kepolisian", internal: "ketua tim" })[e.target] || e.target}: ${view.text(e.title)}`, kind: "escalation" })),
        ].sort((x, y) => String(y.at).localeCompare(String(x.at)));
        const group = ctx.groups.find((g) => g.id === ctx.groupOf.get(a.id));
        res.json({
            identity,
            account: {
                ...view.summary(a),
                profile: p ? { createdAt: p.createdAt, followers: p.followers, following: p.following, defaultAvatar: !!p.defaultAvatar, bio: view.hide(a) ? null : p.bio || null, city: p.city, province: p.province, locationClaimed: !!p.locationClaimed } : null,
            },
            group: group ? { id: group.id, label: group.label, ideology: group.ideology, stance: group.stance, summary: group.summary, size: group.size } : null,
            history, connections,
            posts: a.posts.slice().reverse().slice(0, 40).map((s) => ({ id: s.id, at: s.published_at || s.captured_at, title: view.text(s.title), platform: s.platform, category: s.metadata?.cve?.category || null, city: s.metadata?.geo?.cities?.[0] || null, archiveId: s.metadata?.archive_id || null, repostOf: s.metadata?.repost_of ? (identity.masked ? "•••" : s.metadata.repost_of) : null, story: ctx.narrativeOf.get(s.id)?.title || null })),
        });
    } catch (err) { next(err); }
});

// GET /investigations/network: accounts that are linked to another account, the links and the groups.
router.get("/network", async (req, res, next) => {
    try {
        const c = await context(req, res);
        if (!c) return;
        const { ctx, identity, view } = c;
        const linked = new Set(ctx.edges.flatMap((e) => [e.source, e.target]));
        const nodes = [...ctx.accounts.values()].filter((a) => linked.has(a.id) || ctx.groupOf.has(a.id)).filter((a) => !a.publisher).slice(0, 260).map((a) => ({
            id: view.idOf(a.id), label: view.nameOf(a.id), group: ctx.groupOf.get(a.id) || null, automation: a.automation.level, score: a.automation.score, reach: a.reach, posts: a.posts.length, bridge: (a.profile?.alsoIn || []).length > 0,
        }));
        const shown = new Set(nodes.map((n) => n.id));
        const edges = ctx.edges.map((e) => ({ source: view.idOf(e.source), target: view.idOf(e.target), weight: e.weight, kinds: e.kinds })).filter((e) => shown.has(e.source) && shown.has(e.target));
        res.json({ identity, nodes, edges, groups: ctx.groups.map((g) => ({ id: g.id, label: g.label, ideology: g.ideology, stance: g.stance, size: g.size, automatedShare: g.automatedShare, summary: g.summary })) });
    } catch (err) {
        logStructured("warn", "investigation_network_failed", { error: err?.message });
        next(err);
    }
});

export default router;
