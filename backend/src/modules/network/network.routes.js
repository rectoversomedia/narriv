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
import { loadNetworkInput, refreshCampSummaries, storedCampSummaries } from "./network.service.js";
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
        camps: net.camps.map((c) => ({ ...c, topAccounts: c.topAccounts.map(alias), samples: (c.samples || []).map(maskHandles) })),
        topAccounts: net.topAccounts.map((a) => ({ ...a, id: alias(a.name), name: alias(a.name), url: null, samples: (a.samples || []).map((x) => ({ ...x, text: maskHandles(x.text) })) })),
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
        const { comments, videos } = await loadNetworkInput(workspaceId, { days, signalFilter });

        // What the free sources brought in the period, so the page can show where the network comes from.
        const { data: socialRows } = await supabase
            .from("signals").select("platform").eq("workspace_id", workspaceId).gte("captured_at", since).in("platform", ["youtube", "telegram"]);
        const counts = (socialRows || []).reduce((m, r) => ({ ...m, [r.platform]: (m[r.platform] || 0) + 1 }), {});
        const { data: ws } = await supabase.from("workspaces").select("settings").eq("id", workspaceId).maybeSingle();
        const sources = [
            { key: "youtube_comments", free: true, configured: isCommentCollectionConfigured(), items: comments.length, videos: counts.youtube || 0 },
            { key: "telegram", free: true, configured: true, items: counts.telegram || 0, channels: telegramChannels(ws?.settings) },
        ];

        const built = buildNetwork(comments, videos);
        // AI names and summaries of the camps, stored at collection time (no AI call on read).
        const summaries = await storedCampSummaries(workspaceId);
        built.camps = built.camps.map((c) => ({ ...c, ...(summaries.get(c.key) ? { label: summaries.get(c.key).label, summary: summaries.get(c.key).summary, stance: summaries.get(c.key).stance } : {}) }));
        let net = { days, ...built, sources, monitoringPaused: ws?.settings?.monitoringPaused === true };
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
        // Bounded to stay well inside the 30s request limit: the page calls again while `more` is true.
        const result = await collectYouTubeComments(workspaceId, { maxVideos: 15, withTopVideos: true, deadline: Date.now() + 14000 });
        const summaries = result.more ? { camps: 0 } : await refreshCampSummaries(workspaceId);
        res.status(201).json({ ...result, campsSummarized: summaries.camps });
    } catch (error) {
        logStructured("error", "network_collect_failed", { error: error?.message || error });
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
