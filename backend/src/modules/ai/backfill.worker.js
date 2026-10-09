/**
 * Backfill worker (Phase 7)
 *
 * Worker function (NOT a BullMQ worker) invoked by the cron path.
 * It processes signals that lack signal_analysis rows. Idempotent.
 *
 * For production: uses real OpenAI via the existing analyzeSignal().
 * No synthetic data is ever produced.
 */

import { baseSupabaseAdmin } from "../../lib/supabase.js";
import { analyzeSignal } from "../ai/ai.service.js";
import { logStructured } from "../../lib/logger.js";

function pickText(signal) {
    const title = String(signal.title || "").trim();
    const content = String(signal.content || "").trim();
    if (title && content) return `${title}\n\n${content}`;
    return content || title || "";
}

/**
 * Run retro-analysis for a single workspace. Safe to call repeatedly.
 * Returns { found, processed, failed, alreadyAnalyzed }.
 */
export async function handleRetroanalyze(workspaceId, { limit = 100 } = {}) {
    if (!workspaceId) return { found: 0, processed: 0, failed: 0, alreadyAnalyzed: 0 };

    const { data: signals, error: sigErr } = await baseSupabaseAdmin
        .from("signals")
        .select("id, title, content")
        .eq("workspace_id", workspaceId)
        .order("captured_at", { ascending: false })
        .limit(Math.min(Math.max(1, limit), 500));
    if (sigErr) {
        logStructured("error", "cron_retroanalyze: signals query failed", { error: sigErr.message, workspaceId });
        return { found: 0, processed: 0, failed: 0, alreadyAnalyzed: 0, error: sigErr.message };
    }
    if (!signals || signals.length === 0) {
        return { found: 0, processed: 0, failed: 0, alreadyAnalyzed: 0 };
    }

    const { data: existing } = await baseSupabaseAdmin
        .from("signal_analysis")
        .select("signal_id")
        .eq("workspace_id", workspaceId)
        .in("signal_id", signals.map((s) => s.id));
    const alreadyAnalyzed = new Set((existing || []).map((e) => e.signal_id));
    const toProcess = signals.filter((s) => !alreadyAnalyzed.has(s.id));

    let processed = 0;
    let failed = 0;
    for (const signal of toProcess) {
        try {
            const text = pickText(signal);
            if (!text) { failed += 1; continue; }
            const result = await analyzeSignal(signal.title || null, text);
            const row = {
                workspace_id: workspaceId,
                signal_id: signal.id,
                sentiment: String(result?.sentiment || "neutral").toLowerCase(),
                narrative_type: String(result?.narrative_type || "general").toLowerCase(),
                impact: String(result?.impact || "low").toLowerCase(),
                stakeholder: result?.stakeholder || null,
                summary: result?.summary || null,
                recommended_action: result?.recommended_action || null,
                confidence_score: typeof result?.confidence_score === "number" ? result.confidence_score : null,
            };
            const { error: insErr } = await baseSupabaseAdmin
                .from("signal_analysis")
                .upsert(row, { onConflict: "signal_id" });
            if (insErr) { failed += 1; continue; }
            processed += 1;
        } catch (_) {
            failed += 1;
        }
    }
    return { found: signals.length, alreadyAnalyzed: alreadyAnalyzed.size, processed, failed };
}
