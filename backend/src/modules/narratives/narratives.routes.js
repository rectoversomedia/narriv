import express from "express";
import supabase from "../../lib/supabase.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveScopedWorkspaceIds, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { compareClusterPeriods, runClustering } from "../clustering/clustering.service.js";
import { logStructured } from "../../lib/logger.js";
import { recordAuditLog } from "../../lib/audit.js";
import { wrapAsync } from "../../lib/sentry.js";

const router = express.Router();
router.use(verifyToken);

// Member signals with their persisted analyses (used for confidence, source
// count and momentum; nothing below is estimated without these records).
export const NARRATIVE_LIST_SELECT =
    "*, narrative_cluster_signals(signal:signals(id, platform, captured_at, published_at, analyses:signal_analyses(confidence, analysis)))";

import { analysisConfidence, narrativeMomentum } from "../../lib/narrative-momentum.js";
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
    const firstSeen = signals.reduce((min, s) => (s.captured_at && (!min || s.captured_at < min) ? s.captured_at : min), null);
    const lastSeen = signals.reduce((max, s) => (s.captured_at && (!max || s.captured_at > max) ? s.captured_at : max), null);

    return {
        id: cluster.id,
        title: cluster.title,
        description: cluster.description || cluster.main_narrative || "",
        sourceCount: uniquePlatforms.size || 0,
        confidence: avgConfidence,
        confidenceBasis: confidenceValues.length ? `${confidenceValues.length} analysed member signal(s)` : "no analysed member signals",
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

        return res.json({
            ...toNarrativeItem(cluster),
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
