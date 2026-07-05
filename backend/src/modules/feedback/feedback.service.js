import supabase from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK SERVICE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Records user feedback on an AI output (accept, edit, or reject).
 *
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.targetType - signal_analysis | alert | action_plan | cluster
 * @param {string} params.targetId - ID of the entity
 * @param {string} params.action - accepted | edited | rejected
 * @param {object} [params.originalOutput] - The AI's original output
 * @param {object} [params.editedOutput] - The user's corrected version (if edited)
 * @param {string} [params.reason] - Why the user rejected or edited
 * @param {string} [params.userId]
 * @returns {Promise<object>} - The saved feedback record.
 */
export async function submitFeedback({ workspaceId, targetType, targetId, action, originalOutput, editedOutput, reason, userId }) {
    const validActions = ["accepted", "edited", "rejected"];
    if (!validActions.includes(action)) {
        throw new Error(`Invalid action: ${action}. Must be one of: ${validActions.join(", ")}`);
    }

    const validTypes = ["signal_analysis", "alert", "action_plan", "cluster"];
    if (!validTypes.includes(targetType)) {
        throw new Error(`Invalid targetType: ${targetType}. Must be one of: ${validTypes.join(", ")}`);
    }

    if ((action === "edited" || action === "rejected") && (!reason || !String(reason).trim())) {
        throw new Error("reason is required when action is edited or rejected");
    }

    // If editing a signal analysis, also update the analysis record in-place
    if (targetType === "signal_analysis" && action === "edited" && editedOutput) {
        try {
            const { error } = await supabase
                .from("signal_analyses")
                .update({
                    sentiment: editedOutput.sentiment || null,
                    narrative_type: editedOutput.narrative_type || null,
                    stakeholder: editedOutput.stakeholder || null,
                    impact: editedOutput.impact || null,
                    summary: editedOutput.summary || null,
                    recommended_action: editedOutput.recommended_action || null,
                })
                .eq("id", targetId);

            if (error) {
                throw error;
            }
            logStructured("info", "feedback_signal_analysis_updated", { targetId });
        } catch (err) {
            logStructured("warn", `[FEEDBACK] Could not update SignalAnalysis ${targetId}:`, { details: err.message || err });
        }
    }

    const { data: feedback, error } = await supabase
        .from("ai_feedback")
        .insert({
            workspace_id: workspaceId,
            target_type: targetType,
            target_id: targetId,
            action: action,
            original_output: originalOutput || null,
            edited_output: editedOutput || null,
            reason: reason || null,
            user_id: userId || null,
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    logStructured("info", "feedback_recorded", { action, targetType, targetId });
    return feedback;
}

/**
 * Summarizes action-plan feedback into prompt-scoring signals
 * so future prompts can optimize for acceptance quality.
 *
 * @param {string} workspaceId
 * @returns {Promise<object>}
 */
export async function getActionPlanPromptScoring(workspaceId) {
    const { data: rows, error } = await supabase
        .from("ai_feedback")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("target_type", "action_plan")
        .order("created_at", { ascending: false })
        .limit(200);

    if (error) {
        throw error;
    }

    const total = rows.length;
    if (total === 0) {
        return {
            total_feedback: 0,
            acceptance_rate: 0,
            edit_rate: 0,
            rejection_rate: 0,
            prompt_score: null,
            top_reasons: [],
        };
    }

    const accepted = rows.filter((r) => r.action === "accepted").length;
    const edited = rows.filter((r) => r.action === "edited").length;
    const rejected = rows.filter((r) => r.action === "rejected").length;

    // Weighted score intended for prompt tuning dashboards.
    const promptScore = Math.round((((accepted * 1.0) + (edited * 0.55)) / total) * 100);

    const reasonCounts = {};
    rows
        .filter((r) => r.reason)
        .forEach((r) => {
            const key = String(r.reason).trim().toLowerCase();
            if (!key) return;
            reasonCounts[key] = (reasonCounts[key] || 0) + 1;
        });

    const topReasons = Object.entries(reasonCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([reason, count]) => ({ reason, count }));

    return {
        total_feedback: total,
        acceptance_rate: Math.round((accepted / total) * 100),
        edit_rate: Math.round((edited / total) * 100),
        rejection_rate: Math.round((rejected / total) * 100),
        prompt_score: promptScore,
        top_reasons: topReasons,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING / ACCURACY METRICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates AI accuracy scores based on historical feedback.
 *
 * @param {string|string[]} workspaceId
 * @returns {Promise<object>} - Accuracy metrics.
 */
export async function getAccuracyMetrics(workspaceId) {
    const workspaceIds = Array.isArray(workspaceId) ? workspaceId : [workspaceId];
    const { data: allFeedback, error } = await supabase
        .from("ai_feedback")
        .select("*")
        .in("workspace_id", workspaceIds)
        .order("created_at", { ascending: false });

    if (error) {
        throw error;
    }

    const total = allFeedback.length;
    if (total === 0) {
        return {
            total_feedback: 0,
            accuracy_score: null,
            acceptance_rate: 0,
            edit_rate: 0,
            rejection_rate: 0,
            by_type: {},
            trend: []
        };
    }

    const accepted = allFeedback.filter(f => f.action === "accepted").length;
    const edited = allFeedback.filter(f => f.action === "edited").length;
    const rejected = allFeedback.filter(f => f.action === "rejected").length;

    // Accuracy formula: accepted = 1.0, edited = 0.5, rejected = 0.0
    const accuracyScore = Math.round(((accepted * 1.0 + edited * 0.5 + rejected * 0.0) / total) * 100) / 100;

    // Per-type breakdown
    const byType = {};
    const validTypes = ["signal_analysis", "alert", "action_plan", "cluster"];
    validTypes.forEach(type => {
        const typeFeedback = allFeedback.filter(f => f.target_type === type);
        const typeTotal = typeFeedback.length;
        if (typeTotal > 0) {
            const typeAccepted = typeFeedback.filter(f => f.action === "accepted").length;
            const typeEdited = typeFeedback.filter(f => f.action === "edited").length;
            const typeRejected = typeFeedback.filter(f => f.action === "rejected").length;
            byType[type] = {
                total: typeTotal,
                accepted: typeAccepted,
                edited: typeEdited,
                rejected: typeRejected,
                accuracy: Math.round(((typeAccepted * 1.0 + typeEdited * 0.5) / typeTotal) * 100) / 100
            };
        }
    });

    // Weekly trend (last 8 weeks)
    const trend = [];
    for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
        const weekFeedback = allFeedback.filter(f => {
            const d = new Date(f.created_at);
            return d >= weekStart && d < weekEnd;
        });
        const wTotal = weekFeedback.length;
        if (wTotal > 0) {
            const wAccepted = weekFeedback.filter(f => f.action === "accepted").length;
            const wEdited = weekFeedback.filter(f => f.action === "edited").length;
            trend.push({
                week_start: weekStart.toISOString().split("T")[0],
                total: wTotal,
                accuracy: Math.round(((wAccepted * 1.0 + wEdited * 0.5) / wTotal) * 100) / 100
            });
        }
    }

    return {
        total_feedback: total,
        accuracy_score: accuracyScore,
        acceptance_rate: Math.round((accepted / total) * 100) / 100,
        edit_rate: Math.round((edited / total) * 100) / 100,
        rejection_rate: Math.round((rejected / total) * 100) / 100,
        by_type: byType,
        trend
    };
}

/**
 * Returns the most common rejection reasons for improving prompts.
 *
 * @param {string} workspaceId
 * @returns {Promise<Array>}
 */
export async function getRejectionInsights(workspaceId) {
    const { data: rejections, error } = await supabase
        .from("ai_feedback")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("action", "rejected")
        .not("reason", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        throw error;
    }

    // Group by targetType
    const grouped = {};
    rejections.forEach(r => {
        if (!grouped[r.target_type]) grouped[r.target_type] = [];
        grouped[r.target_type].push({
            target_id: r.target_id,
            reason: r.reason,
            created_at: r.created_at
        });
    });

    return {
        total_rejections: rejections.length,
        by_type: grouped
    };
}
