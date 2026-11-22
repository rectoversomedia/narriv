import express from "express";
import supabase from "../../lib/supabase.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { logStructured } from "../../lib/logger.js";
import { toneAccuracy, normalTone, wilson } from "../../lib/tone-accuracy.js";
import { cveAccuracy } from "../../lib/cve-categories.js";

/**
 * Measured accuracy: people check the AI's tone on a sample of records (Benar / Salah + the right tone). Each verdict
 * is kept on the record (signals.metadata.tone_review) and the accuracy is computed from them with its sample size and
 * a 95% interval, so the number shown to a client is earned, not claimed.
 */
const router = express.Router();
router.use(verifyToken);

const aiTone = (s) => normalTone((s.analyses || []).find((a) => a?.analysis?.sentiment)?.analysis?.sentiment || s.sentiment);

// GET /api/quality — tone accuracy from the reviews so far.
router.get("/", async (req, res) => {
    try {
        const ws = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!ws) return res.status(403).json({ error: "Workspace access denied" });
        const scope = req.query.scope === "all" ? null : ws;
        let q = supabase.from("signals").select("metadata").not("metadata->tone_review", "is", null).limit(5000);
        if (scope) q = q.eq("workspace_id", scope);
        const { data, error } = await q;
        if (error) throw error;
        res.json(toneAccuracy((data || []).map((r) => r.metadata.tone_review)));
    } catch (error) {
        logStructured("error", "quality_fetch_failed", { error: error?.message });
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/quality/cve — PCVE category accuracy from the team's confirm / dismiss / correct reviews.
router.get("/cve", async (req, res) => {
    try {
        const ws = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!ws) return res.status(403).json({ error: "Workspace access denied" });
        const { data, error } = await supabase.from("signals").select("metadata").eq("workspace_id", ws).not("metadata->cve->review", "is", null).limit(5000);
        if (error) throw error;
        res.json(cveAccuracy((data || []).map((r) => r.metadata?.cve), wilson));
    } catch (error) {
        logStructured("error", "quality_cve_failed", { error: error?.message });
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/quality/sample?n=20 — analysed records nobody has checked yet, newest first, mixed across tones.
router.get("/sample", async (req, res) => {
    try {
        const ws = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!ws) return res.status(403).json({ error: "Workspace access denied" });
        const n = Math.min(Math.max(Number(req.query.n) || 20, 1), 50);
        const { data, error } = await supabase
            .from("signals")
            .select("id, title, content, platform, url, sentiment, captured_at, metadata, analyses:signal_analyses(analysis)")
            .eq("workspace_id", ws)
            .is("metadata->tone_review", null)
            .order("captured_at", { ascending: false })
            .limit(300);
        if (error) throw error;
        const rows = (data || []).filter((s) => aiTone(s));
        // Balance the sample across tones so accuracy is not only measured on easy neutral records.
        const byTone = {};
        for (const s of rows) (byTone[aiTone(s)] ||= []).push(s);
        const out = [];
        for (let i = 0; out.length < n && i < 300; i++) for (const t of Object.keys(byTone)) { const s = byTone[t][i]; if (s && out.length < n) out.push(s); }
        res.json({ data: out.map((s) => ({ id: s.id, title: s.title, excerpt: String(s.content || "").slice(0, 280), platform: s.platform, url: s.url, aiTone: aiTone(s), publisher: s.metadata?.publisher || null })) });
    } catch (error) {
        logStructured("error", "quality_sample_failed", { error: error?.message });
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/quality/review { signalId, tone } — the person's tone for a record (equal to the AI's = correct).
router.post("/review", async (req, res) => {
    try {
        const ws = await resolveWorkspaceIdForUser(req.user.id, req.body?.workspaceId);
        if (!ws) return res.status(403).json({ error: "Workspace access denied" });
        const human = normalTone(req.body?.tone);
        if (!human) return res.status(400).json({ error: "tone must be positive, neutral, negative or mixed." });
        const { data: s } = await supabase.from("signals").select("id, workspace_id, sentiment, metadata, analyses:signal_analyses(analysis)").eq("id", req.body?.signalId).maybeSingle();
        if (!s || s.workspace_id !== ws) return res.status(404).json({ error: "Record not found" });
        const ai = aiTone(s);
        const review = { ai, human, correct: ai === human, by: req.user.id, at: new Date().toISOString() };
        const patch = { metadata: { ...(s.metadata || {}), tone_review: review } };
        if (!review.correct) patch.sentiment = human.toUpperCase();
        const { error } = await supabase.from("signals").update(patch).eq("id", s.id);
        if (error) throw error;
        (await import("../../lib/tone-learning.js")).forgetToneContext(ws);
        res.status(201).json(review);
    } catch (error) {
        logStructured("error", "quality_review_failed", { error: error?.message });
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
