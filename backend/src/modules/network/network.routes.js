import express from "express";
import supabase from "../../lib/supabase.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { requireWorkspaceRole, MANAGER_ROLES, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { buildNetwork } from "../../lib/conversation-network.js";
import { getWorkspaceProfile } from "../../lib/workspace-profile.js";
import { maskHandles } from "../../lib/privacy.js";
import { logStructured } from "../../lib/logger.js";
import { requestLang } from "../../lib/request-context.js";
import { collectYouTubeComments, isCommentCollectionConfigured } from "./youtube-comments.service.js";
import { telegramChannels } from "../ingestion/telegram.service.js";

const router = express.Router();
router.use(verifyToken);

// In privacy mode accounts become numbered ("Akun 3") and texts lose @handles; the structure stays readable.
function maskNetwork(net, lang) {
    const names = new Map();
    const alias = (n) => {
        if (!names.has(n)) names.set(n, `${lang === "en" ? "Account" : "Akun"} ${names.size + 1}`);
        return names.get(n);
    };
    return {
        ...net,
        nodes: net.nodes.map((n) => (n.kind === "account" ? { ...n, label: alias(n.label) } : n)),
        camps: net.camps.map((c) => ({ ...c, topAccounts: c.topAccounts.map(alias) })),
        topAccounts: net.topAccounts.map((a) => ({ ...a, name: alias(a.name) })),
        coordination: net.coordination.map((c) => ({ ...c, text: maskHandles(c.text), accounts: c.accounts?.map(alias), account: c.account ? alias(c.account) : undefined })),
    };
}

// GET /api/network?days=30[&clusterId=] — the conversation network under the workspace's YouTube videos.
router.get("/", async (req, res) => {
    try {
        const workspaceId = await resolveWorkspaceIdForUser(req.user.id);
        const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
        const empty = { days, stats: { accounts: 0, comments: 0, replies: 0, videos: 0 }, nodes: [], edges: [], camps: [], topAccounts: [], coordination: [], sources: [] };
        if (!workspaceId) return res.json(empty);
        const since = new Date(Date.now() - days * 86400000).toISOString();

        let signalFilter = null;
        if (req.query.clusterId) {
            const { data: links } = await supabase.from("narrative_cluster_signals").select("signal_id").eq("cluster_id", String(req.query.clusterId)).limit(200);
            signalFilter = (links || []).map((l) => l.signal_id);
        }
        // Comments are stored per video in raw_documents (external_id "ytcomments:<videoId>").
        const { data: docs, error } = await supabase
            .from("raw_documents")
            .select("metadata")
            .eq("workspace_id", workspaceId)
            .like("external_id", "ytcomments:%")
            .limit(300);
        if (error) throw error;
        const wanted = signalFilter ? new Set(signalFilter) : null;
        // A video is its signal when Narriv stored one, otherwise the video itself (most-viewed videos of the period).
        const kept = (docs || []).filter((d) => (d.metadata?.signal_id || d.metadata?.video?.id) && (!wanted || wanted.has(d.metadata.signal_id)));
        const vid = (d) => d.metadata.signal_id || `yt:${d.metadata.video.id}`;
        const comments = kept.flatMap((d) => (Array.isArray(d.metadata.comments) ? d.metadata.comments : [])
            .filter((c) => !c.published_at || c.published_at >= since)
            .map((c) => ({ ...c, signal_id: vid(d) })));
        const used = new Set(comments.map((c) => c.signal_id));
        const signalIds = [...used].filter((id) => !id.startsWith("yt:"));
        const { data: signalVideos } = signalIds.length
            ? await supabase.from("signals").select("id, title, author, url").in("id", signalIds)
            : { data: [] };
        const videos = [
            ...(signalVideos || []),
            ...kept.filter((d) => !d.metadata.signal_id && used.has(vid(d))).map((d) => ({ id: vid(d), title: d.metadata.video.title, author: d.metadata.video.channel, url: d.metadata.video.url })),
        ];

        // What the free sources brought in the period, so the page can show where the network comes from.
        const { data: socialRows } = await supabase
            .from("signals").select("platform").eq("workspace_id", workspaceId).gte("captured_at", since).in("platform", ["youtube", "telegram"]);
        const counts = (socialRows || []).reduce((m, r) => ({ ...m, [r.platform]: (m[r.platform] || 0) + 1 }), {});
        const { data: ws } = await supabase.from("workspaces").select("settings").eq("id", workspaceId).maybeSingle();
        const sources = [
            { key: "youtube_comments", free: true, configured: isCommentCollectionConfigured(), items: comments.length, videos: counts.youtube || 0 },
            { key: "telegram", free: true, configured: true, items: counts.telegram || 0, channels: telegramChannels(ws?.settings) },
        ];

        let net = { days, ...buildNetwork(comments, videos || []), sources, monitoringPaused: ws?.settings?.monitoringPaused === true };
        const profile = await getWorkspaceProfile(workspaceId);
        if (profile?.privacyMode) net = { ...maskNetwork(net, requestLang()), privacyMode: true };
        res.json(net);
    } catch (error) {
        logStructured("error", "network_fetch_failed", { error: error?.message || error });
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/network/collect — pull comments now for the latest videos (managers; also works on a paused workspace,
// which is how example workspaces get fresh data on request).
router.post("/collect", requireWorkspaceRole(MANAGER_ROLES), async (req, res) => {
    try {
        const workspaceId = await resolveWorkspaceIdForUser(req.user.id, req.body?.workspaceId);
        if (!workspaceId) return res.status(403).json({ error: "Workspace access denied" });
        if (!isCommentCollectionConfigured()) return res.status(400).json({ error: "YouTube is not connected.", code: "YOUTUBE_NOT_CONFIGURED" });
        const result = await collectYouTubeComments(workspaceId, { maxVideos: 15, withTopVideos: true });
        res.status(201).json(result);
    } catch (error) {
        logStructured("error", "network_collect_failed", { error: error?.message || error });
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
