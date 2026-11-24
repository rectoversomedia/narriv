import express from "express";
import { requestLang, tr } from "../../lib/request-context.js";
import supabase from "../../lib/supabase.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveScopedWorkspaceIds, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { compareClusterPeriods, runClustering } from "../clustering/clustering.service.js";
import { logStructured } from "../../lib/logger.js";
import { recordAuditLog } from "../../lib/audit.js";
import { wrapAsync } from "../../lib/sentry.js";
import { buildSpread } from "../../lib/narrative-spread.js";
import { buildJourney } from "../../lib/narrative-journey.js";
import { getFraming } from "../../lib/narrative-framing.js";
import { getChatClient, anyAiConfigured } from "../../lib/chat-client.js";
import { workspaceLanguage } from "../../lib/workspace-language.js";
import { buildPrecedents } from "../../lib/narrative-precedents.js";
import { getWorkspaceProfile } from "../../lib/workspace-profile.js";
import { maskSignal } from "../../lib/privacy.js";
import { buildWaves } from "../../lib/content-waves.js";
import { rateLimiters } from "../../middlewares/rate-limit.js";
import { checkBudgetAllowance } from "../../lib/cost-management.js";

const router = express.Router();
router.use(verifyToken);

// Member signals with their persisted analyses (used for confidence, source
// count and momentum; nothing below is estimated without these records).
export const NARRATIVE_LIST_SELECT =
    "*, narrative_cluster_signals(signal:signals(id, title, platform, sentiment, captured_at, published_at, analyses:signal_analyses(confidence, analysis)))";

import { analysisConfidence, narrativeMomentum } from "../../lib/narrative-momentum.js";
import { affectedAudiences, narrativeRisk, riskBadges } from "../../lib/narrative-risk.js";
export { analysisConfidence, narrativeMomentum };

export function toNarrativeItem(cluster, now = Date.now()) {
    const signals = (cluster.narrative_cluster_signals || []).map((ncs) => ncs.signal).filter(Boolean);
    const uniquePlatforms = new Set(signals.map((signal) => signal.platform).filter(Boolean));
    const confidenceValues = signals
        .flatMap((signal) => (signal.analyses || []).map(analysisConfidence))
        .filter((value) => value !== null);

    // null when no member has a persisted confidence (previously defaulted to 72).
    const avgConfidence = confidenceValues.length > 0
        ? Math.round((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length) * 100)
        : null;
    const momentum = narrativeMomentum(signals, now);
    const risk = narrativeRisk(cluster, signals, now);
    const firstSeen = signals.reduce((min, s) => (s.captured_at && (!min || s.captured_at < min) ? s.captured_at : min), null);
    const lastSeen = signals.reduce((max, s) => (s.captured_at && (!max || s.captured_at > max) ? s.captured_at : max), null);

    return {
        id: cluster.id,
        title: cluster.title,
        description: cluster.description || cluster.main_narrative || "",
        sourceCount: uniquePlatforms.size || 0,
        confidence: avgConfidence,
        confidenceBasis: confidenceValues.length ? tr(`from ${confidenceValues.length} analysed ${(confidenceValues.length) === 1 ? "article" : "articles"}`, `dari ${confidenceValues.length} berita yang dianalisis`) : tr("no analysed articles yet", "belum ada berita yang dianalisis"),
        impact: (cluster.impact || "MEDIUM").toString(),
        velocity: momentum.label,
        momentum,
        firstSeen,
        lastSeen,
        recommendedFocus: cluster.main_narrative || cluster.description || "Prioritize stakeholder messaging and monitor escalation.",
        // Count only signals actually linked to the narrative; the stored counter can
        // disagree (e.g. seeded clusters with no members) and is reported separately.
        signalCount: Array.isArray(cluster.narrative_cluster_signals) ? signals.length : (cluster.signal_count ?? 0),
        storedSignalCount: cluster.signal_count ?? null,
        hasEvidence: signals.length > 0,
        memberSignals: signals.length,
        // Linked signal ids (capped) so clients can derive real relationships
        // between narratives from shared evidence instead of inventing them.
        memberSignalIds: [...new Set(signals.map((s) => s.id).filter(Boolean))].slice(0, 200),
        sentiment: cluster.sentiment || "neutral",
        // How dangerous this story is, 0–100 with its reasons (lib/narrative-risk.js).
        risk,
        claims: cluster.metadata?.claims?.items || [],
        // Feed card fields: badges from the risk factors, platforms carrying it, who it touches.
        badges: riskBadges(risk),
        platforms: [...uniquePlatforms],
        audiences: affectedAudiences([cluster.title, cluster.description, cluster.main_narrative].join(" ")),
    };
}

// GET /api/narratives - Frontend contract endpoint
router.get("/", async (req, res) => {
    try {
        const { sentiment, impact, workspaceId } = req.query;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const days = parseInt(req.query.days, 10);
        const safePage = Math.max(1, page);
        const safeLimit = Math.max(1, limit);
        const skip = (safePage - 1) * safeLimit;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);
        if (scopedWorkspaceIds.length === 0) {
            return res.json({
                data: [],
                pagination: { page: safePage, limit: safeLimit, total: 0, totalPages: 0 }
            });
        }

        // Build where conditions for Supabase
        let query = supabase
            .from("narrative_clusters")
            .select(NARRATIVE_LIST_SELECT, { count: "exact" })
            .in("workspace_id", scopedWorkspaceIds)
            .order("updated_at", { ascending: false })
            .range(skip, skip + safeLimit - 1);

        if (sentiment) query = query.eq("sentiment", sentiment);
        if (impact) query = query.eq("impact", String(impact).toUpperCase());
        if (Number.isFinite(days) && days > 0) {
            const minDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
            query = query.gte("updated_at", minDate);
        }

        let { data: data, error, count } = await query;

        if (error) {
            logStructured("error", "Error fetching narratives:", { error: error.message || error });
            return res.status(500).json({ error: "Internal server error" });
        }

        // For demo session: if days filter caused 0 results, fallback to fetching all seeded clusters
        if ((!data || data.length === 0) && Number.isFinite(days) && days > 0 && (req.user?.isDemo || String(req.user?.id).startsWith("demo"))) {
            let fallbackQuery = supabase
                .from("narrative_clusters")
                .select(NARRATIVE_LIST_SELECT, { count: "exact" })
                .in("workspace_id", scopedWorkspaceIds);
            if (sentiment) fallbackQuery = fallbackQuery.eq("sentiment", sentiment);
            if (impact) fallbackQuery = fallbackQuery.eq("impact", String(impact).toUpperCase());

            const fallbackRes = await fallbackQuery
                .order("updated_at", { ascending: false })
                .range(skip, skip + safeLimit - 1);
            if (!fallbackRes.error && fallbackRes.data && fallbackRes.data.length > 0) {
                data = fallbackRes.data;
                count = fallbackRes.count;
            }
        }

        return res.json({
            data: (data || []).map((c) => toNarrativeItem(c)),
            pagination: {
                page: safePage,
                limit: safeLimit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / safeLimit)
            }
        });
    } catch (error) {
        logStructured("error", "Error fetching narratives:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/narratives/compare — Compare clusters across two time periods
router.get("/compare", async (req, res) => {
    try {
        const { period1Start, period1End, period2Start, period2End, workspaceId } = req.query;

        if (!period1Start || !period1End || !period2Start || !period2End) {
            return res.status(400).json({ error: "All four period dates are required." });
        }

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const result = await compareClusterPeriods(
            scopedWorkspaceId,
            new Date(period1Start),
            new Date(period1End),
            new Date(period2Start),
            new Date(period2End)
        );

        return res.json(result);
    } catch (error) {
        logStructured("error", "Error comparing clusters:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/narratives/cluster - Trigger narrative clustering
router.post("/cluster", async (req, res) => {
    try {
        const { workspaceId } = req.body || {};
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const result = await runClustering(scopedWorkspaceId);
        return res.json(result);
    } catch (error) {
        logStructured("error", "Error running narrative clustering:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Clustering execution failed" });
    }
});

// GET /api/narratives/:id - Detailed narrative for topic detail panel
const WAVE_SELECT = "id, title, description, main_narrative, sentiment, updated_at, narrative_cluster_signals(signal:signals(id, title, content, platform, url, author, sentiment, metadata, captured_at, published_at))";

/** Narratives of one workspace touched in the last `days`, with their records (for waves). */
async function recentClusters(workspaceId, days = 14) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
    const { data, error } = await supabase
        .from("narrative_clusters")
        .select(WAVE_SELECT)
        .eq("workspace_id", workspaceId)
        .gte("updated_at", since)
        .order("updated_at", { ascending: false })
        .limit(60);
    if (error) throw error;
    return (data || []).map((c) => ({ ...c, signals: (c.narrative_cluster_signals || []).map((n) => n.signal).filter(Boolean) }));
}

// GET /api/narratives/waves - Conversations growing right now that a brand could join, each with a risk check and
// the time window it typically lasts (content-waves.js). Social accounts and links are hidden in privacy mode.
router.get("/waves", async (req, res) => {
    try {
        const workspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!workspaceId) return res.json({ waves: [] });
        const [clusters, profile] = await Promise.all([recentClusters(workspaceId), getWorkspaceProfile(workspaceId)]);
        const waves = buildWaves(clusters).map((w) => ({
            ...w,
            samples: profile.privacyMode ? w.samples.map((s) => maskSignal(s, requestLang())) : w.samples,
        }));
        res.json({ waves, generatedAt: new Date().toISOString() });
    } catch (error) {
        logStructured("error", "narrative_waves_failed", { error: error?.message || error });
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/narratives/:id/content-ideas - Three content angles for joining this conversation, in the request
// language, with a caution line. Generated on request only (one model call).
router.post("/:id/content-ideas", rateLimiters.aiGeneration(), async (req, res) => {
    try {
        const { id } = req.params;
        if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(404).json({ error: "Narrative cluster not found" });
        const { data: cluster } = await supabase.from("narrative_clusters").select(WAVE_SELECT + ", workspace_id").eq("id", id).maybeSingle();
        const workspaceId = cluster ? await resolveWorkspaceIdForUser(req.user.id, cluster.workspace_id) : null;
        if (!cluster || !workspaceId) return res.status(404).json({ error: "Narrative cluster not found" });
        // Same AI budget rule as every other on-demand model call.
        const budget = await checkBudgetAllowance(workspaceId).catch(() => ({ allowed: true }));
        if (budget?.allowed === false) return res.status(402).json({ error: tr("This workspace has reached its AI usage budget for the month.", "Workspace ini sudah mencapai batas anggaran AI bulan ini."), code: "BUDGET_EXCEEDED" });
        const signals = (cluster.narrative_cluster_signals || []).map((n) => n.signal).filter(Boolean);
        const [wave] = buildWaves([{ ...cluster, signals }], Date.now());
        const { data: settings } = await supabase.from("workspace_settings").select("brand_name").eq("workspace_id", workspaceId).maybeSingle();
        const lang = requestLang() === "id" ? "id" : "en";
        const riskText = wave ? `${wave.risk.level}${wave.risk.reasons.length ? ` (${wave.risk.reasons.map((r) => `${r.code}: ${r.value}`).join(", ")})` : ""}` : null;
        const { suggestContentAngles } = await import("../ai/ai.service.js");
        const ideas = await suggestContentAngles({
            brand: settings?.brand_name || null,
            title: cluster.title,
            description: cluster.description || cluster.main_narrative || "",
            samples: signals.slice(0, 6).map((s) => s.title || s.content || ""),
            risk: riskText,
            lang,
        }, { workspaceId, operation: "content_ideas" });
        if (!ideas) return res.status(503).json({ error: tr("Content ideas are unavailable right now. Please try again.", "Ide konten belum bisa dibuat saat ini. Silakan coba lagi.") });
        res.json(ideas);
    } catch (error) {
        logStructured("error", "content_ideas_failed", { error: error?.message || error });
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (!isUuid) {
            return res.status(404).json({ error: "Narrative cluster not found" });
        }

        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        const { data: cluster, error } = await supabase
            .from("narrative_clusters")
            .select(`
                *,
                narrative_cluster_signals (
                    created_at,
                    signal:signals (
                        id,
                        title,
                        content,
                        platform,
                        url,
                        author,
                        region,
                        metadata,
                        sentiment,
                        captured_at,
                        published_at,
                        analyses:signal_analyses (confidence, analysis)
                    )
                )
            `)
            .eq("id", id)
            .maybeSingle();

        if (error) {
            logStructured("error", "Error fetching narrative:", { error: error.message || error });
            return res.status(500).json({ error: "Internal server error" });
        }

        const isAllowed = cluster && (scopedWorkspaceIds.includes(cluster.workspace_id) ||
            (req.user?.isDemo && (cluster.workspace_id === "56bc14ee-5f16-4134-9828-a240f3c72240" || cluster.workspace_id === "4c77fd4b-7dc2-4a9b-be78-f9eee336e042")));

        if (!cluster || !isAllowed) {
            return res.status(404).json({ error: "Narrative cluster not found" });
        }

        // Evidence = only the signals actually linked to this narrative. Never
        // substitute other workspace signals, and never default missing sentiment.
        const { privacyMode } = await getWorkspaceProfile(cluster.workspace_id);
        const memberRows = (cluster.narrative_cluster_signals || []).map((ncs) => ncs.signal).filter(Boolean);
        const relatedSignals = (cluster.narrative_cluster_signals || [])
            .filter((ncs) => ncs.signal)
            .map((ncs) => {
                const analysis = (ncs.signal.analyses || []).find((a) => a?.analysis) || (ncs.signal.analyses || [])[0] || null;
                const sentiment = String(analysis?.analysis?.sentiment || ncs.signal.sentiment || "").toLowerCase();
                return {
                    id: ncs.signal.id,
                    title: ncs.signal.title,
                    content: ncs.signal.content,
                    platform: ncs.signal.platform,
                    url: ncs.signal.url,
                    sentiment: ["positive", "negative", "neutral", "mixed"].includes(sentiment) ? sentiment : "unanalyzed",
                    impact: analysis?.analysis?.impact || null,
                    analysisConfidence: analysisConfidence(analysis),
                    capturedAt: ncs.signal.captured_at,
                    publishedAt: ncs.signal.published_at
                };
            })
            .map((item) => (privacyMode ? maskSignal(item, requestLang()) : item))
            .sort((a, b) => String(b.capturedAt || "").localeCompare(String(a.capturedAt || "")));

        const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0, mixed: 0, unanalyzed: 0 };
        relatedSignals.forEach((signal) => {
            sentimentBreakdown[signal.sentiment] += 1;
        });

        const trendMap = {};
        relatedSignals.forEach((signal) => {
            if (!signal.capturedAt) return;
            const dateKey = new Date(signal.capturedAt).toISOString().split("T")[0];
            if (!trendMap[dateKey]) trendMap[dateKey] = 0;
            trendMap[dateKey]++;
        });

        const trends = Object.entries(trendMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const item = toNarrativeItem(cluster);
        const spread = buildSpread(memberRows, { privacy: privacyMode });
        const journey = buildJourney(memberRows, { privacy: privacyMode });
        // One small AI call per issue when its records change; stored on the cluster afterwards.
        const framing = anyAiConfigured()
            ? await getFraming({ cluster, members: memberRows, lang: await workspaceLanguage(cluster.workspace_id), db: supabase, chat: getChatClient() }).catch(() => null)
            : (cluster.metadata?.framing || null);
        const history = await narrativeHistory(cluster, item.firstSeen).catch((err) => {
            logStructured("warn", "narrative_precedents_failed", { error: err?.message });
            return { precedents: [], expectation: null };
        });

        return res.json({
            ...item,
            spread,
            journey,
            framing: framing ? { frames: framing.frames, at: framing.at } : null,
            ...history,
            trends,
            sentimentBreakdown,
            relatedSignals,
            evidenceNote: relatedSignals.length === 0 ? "No signals are linked to this narrative yet, so there is no evidence to show." : null,
        });
    } catch (error) {
        logStructured("error", "Error fetching narrative:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

/** Earlier narratives of the same workspace that resemble this one, and what they suggest (narrative-precedents.js). */
async function narrativeHistory(cluster, firstSeen) {
    const { data: candidates } = await supabase
        .from("narrative_clusters")
        .select("id, title, description, main_narrative, keywords, sentiment, narrative_cluster_signals(signal:signals(captured_at, published_at, sentiment))")
        .eq("workspace_id", cluster.workspace_id)
        .neq("id", cluster.id)
        .order("updated_at", { ascending: false })
        .limit(80);
    const rows = (candidates || []).map((c) => ({ ...c, signals: (c.narrative_cluster_signals || []).map((n) => n.signal).filter(Boolean) }));
    const ids = rows.map((c) => c.id);
    const { data: plans } = ids.length
        ? await supabase.from("action_plans").select("cluster_id, title, status, type, created_at").eq("workspace_id", cluster.workspace_id).in("cluster_id", ids).order("created_at", { ascending: true })
        : { data: [] };
    return buildPrecedents({ ...cluster, firstSeen }, rows, plans || []);
}

// POST /api/narratives - Create a new narrative cluster
router.post("/", async (req, res) => {
    try {
        const { title, description, workspaceId, priority, keywords } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: "title is required" });
        }

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const { data: cluster, error } = await supabase
            .from("narrative_clusters")
            .insert({
                workspace_id: scopedWorkspaceId,
                title: title.trim(),
                description: description || null,
                priority: priority || "MEDIUM",
                keywords: keywords || [],
                signal_count: 0,
                velocity: 0,
                impact: "MEDIUM",
                lifecycle: "active",
            })
            .select()
            .single();

        if (error) {
            logStructured("error", "Error creating narrative:", { error: error.message || error });
            return res.status(500).json({ error: "Internal server error" });
        }

        await recordAuditLog({
            userId: req.user.id,
            event: "narrative_created",
            workspaceId: scopedWorkspaceId,
            metadata: { clusterId: cluster.id, title: cluster.title }
        });

        return res.status(201).json(toNarrativeItem(cluster));
    } catch (error) {
        logStructured("error", "Error creating narrative:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/narratives/:id - Update a narrative cluster
/**
 * POST /api/narratives/:id/split — move some of an issue's records into a new issue, for when two stories were put
 * together. Body { signalIds: string[], title: string }. The two issues are then kept apart: automatic merging
 * (clustering.service mergeSimilarIssues) never joins them again. Viewers and the demo cannot split.
 */
router.post("/:id/split", async (req, res) => {
    try {
        if (String(req.user?.id || "").startsWith("demo")) return res.status(403).json({ error: tr("The demo is read-only.", "Demo hanya bisa dilihat.") });
        const signalIds = [...new Set((Array.isArray(req.body?.signalIds) ? req.body.signalIds : []).map(String))].slice(0, 500);
        const title = String(req.body?.title || "").trim().slice(0, 120);
        if (!signalIds.length) return res.status(400).json({ error: tr("Pick at least one record.", "Pilih minimal satu catatan.") });
        if (title.length < 3) return res.status(400).json({ error: tr("Give the new issue a title.", "Beri judul untuk isu baru.") });

        const { data: source } = await supabase.from("narrative_clusters").select("id, workspace_id, sentiment, impact, priority").eq("id", req.params.id).maybeSingle();
        if (!source) return res.status(404).json({ error: "Narrative cluster not found" });
        const ws = await resolveWorkspaceIdForUser(req.user.id, source.workspace_id);
        if (!ws || ws !== source.workspace_id) return res.status(403).json({ error: "Workspace access denied" });
        const { data: member } = await supabase.from("workspace_members").select("role").eq("user_id", req.user.id).eq("workspace_id", ws).maybeSingle();
        if (member?.role === "viewer") return res.status(403).json({ error: tr("Viewers cannot change issues.", "Pembaca tidak bisa mengubah isu.") });

        const { data: links } = await supabase.from("narrative_cluster_signals").select("signal_id").eq("cluster_id", source.id);
        const inIssue = new Set((links || []).map((l) => String(l.signal_id)));
        const moving = signalIds.filter((id) => inIssue.has(id));
        if (!moving.length) return res.status(400).json({ error: tr("Those records are not in this issue.", "Catatan itu tidak ada di isu ini.") });
        if (moving.length >= inIssue.size) return res.status(400).json({ error: tr("Leave at least one record in this issue.", "Sisakan minimal satu catatan di isu ini.") });

        const now = new Date().toISOString();
        const { data: created, error: createError } = await supabase.from("narrative_clusters").insert({
            workspace_id: ws, title, description: title, main_narrative: title,
            sentiment: source.sentiment || "neutral", impact: source.impact || "MEDIUM", priority: source.priority || source.impact || "MEDIUM",
            signal_count: moving.length, keywords: [], lifecycle: "emerging",
            metadata: { labeledBy: "manual_split", splitFrom: source.id, splitBy: req.user.id, splitAt: now }, updated_at: now,
        }).select("id, title").single();
        if (createError) throw createError;
        const { error: linkError } = await supabase.from("narrative_cluster_signals").insert(moving.map((signal_id) => ({ cluster_id: created.id, signal_id })));
        if (linkError) throw linkError;
        await supabase.from("narrative_cluster_signals").delete().eq("cluster_id", source.id).in("signal_id", moving);
        await supabase.from("narrative_clusters").update({ signal_count: inIssue.size - moving.length, updated_at: now }).eq("id", source.id);

        const { data: wsRow } = await supabase.from("workspaces").select("settings").eq("id", ws).maybeSingle();
        const settings = wsRow?.settings || {};
        await supabase.from("workspaces").update({ settings: { ...settings, keepApartIssues: [...(settings.keepApartIssues || []), [source.id, created.id]].slice(-500) } }).eq("id", ws);
        await recordAuditLog({ userId: req.user.id, workspaceId: ws, event: "narrative_split", metadata: { from: source.id, to: created.id, records: moving.length } }).catch(() => null);
        return res.status(201).json({ id: created.id, title: created.title, moved: moving.length });
    } catch (error) {
        logStructured("error", "narrative_split_failed", { error: error?.message || error });
        return res.status(500).json({ error: tr("The issue could not be split.", "Isu gagal dipisahkan.") });
    }
});

router.patch("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, priority, impact, lifecycle, keywords } = req.body;

        // Fetch existing cluster
        const { data: existing, error: fetchError } = await supabase
            .from("narrative_clusters")
            .select("workspace_id")
            .eq("id", id)
            .single();

        if (fetchError || !existing) {
            return res.status(404).json({ error: "Narrative cluster not found" });
        }

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, existing.workspace_id);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        // Build update object
        const updateData = {};
        if (title !== undefined) updateData.title = title.trim();
        if (description !== undefined) updateData.description = description;
        if (priority !== undefined) updateData.priority = priority;
        if (impact !== undefined) updateData.impact = impact;
        if (lifecycle !== undefined) updateData.lifecycle = lifecycle;
        if (keywords !== undefined) updateData.keywords = keywords;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No valid fields to update" });
        }

        const { data: cluster, error } = await supabase
            .from("narrative_clusters")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            logStructured("error", "Error updating narrative:", { error: error.message || error });
            return res.status(500).json({ error: "Internal server error" });
        }

        await recordAuditLog({
            userId: req.user.id,
            event: "narrative_updated",
            workspaceId: scopedWorkspaceId,
            metadata: { clusterId: id, fields: Object.keys(updateData) }
        });

        return res.json(toNarrativeItem(cluster));
    } catch (error) {
        logStructured("error", "Error updating narrative:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/narratives/:id - Delete a narrative cluster
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch existing cluster
        const { data: existing, error: fetchError } = await supabase
            .from("narrative_clusters")
            .select("workspace_id")
            .eq("id", id)
            .single();

        if (fetchError || !existing) {
            return res.status(404).json({ error: "Narrative cluster not found" });
        }

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, existing.workspace_id);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        // Delete cluster signals first
        await supabase
            .from("narrative_cluster_signals")
            .delete()
            .eq("cluster_id", id);

        // Delete cluster
        const { error } = await supabase
            .from("narrative_clusters")
            .delete()
            .eq("id", id);

        if (error) {
            logStructured("error", "Error deleting narrative:", { error: error.message || error });
            return res.status(500).json({ error: "Internal server error" });
        }

        await recordAuditLog({
            userId: req.user.id,
            event: "narrative_deleted",
            workspaceId: scopedWorkspaceId,
            metadata: { clusterId: id }
        });

        return res.json({ success: true, message: "Narrative cluster deleted" });
    } catch (error) {
        logStructured("error", "Error deleting narrative:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
