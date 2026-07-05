import supabase from "./supabase.js";
import { logStructured } from "./logger.js";

/**
 * Calculate calibrated confidence score based on historical feedback.
 * Looks at accepted/edited/rejected feedback for similar analysis types
 * and adjusts the raw AI confidence score.
 *
 * @param {string} workspaceId
 * @param {string} narrativeType - The narrative type of the current analysis
 * @param {number} rawConfidence - The raw confidence score from AI (0-1)
 * @returns {Promise<number>} - Calibrated confidence score (0-1)
 */
export async function calibrateConfidence(workspaceId, narrativeType, rawConfidence) {
    try {
        // Build query for feedback in this workspace
        let query = supabase
            .from('ai_feedback')
            .select('action')
            .eq('workspace_id', workspaceId)
            .eq('target_type', 'signal_analysis')
            .order('created_at', { ascending: false })
            .limit(50);

        // Add narrative type filter if provided
        if (narrativeType) {
            query = query.eq('narrative_type', narrativeType);
        }

        const { data: feedback, error } = await query;

        if (error || !feedback) {
            throw error || new Error('No feedback data');
        }

        if (feedback.length < 5) {
            // Not enough feedback data, return raw confidence
            return rawConfidence;
        }

        // Calculate acceptance rate
        const accepted = feedback.filter((f) => f.action === "accepted").length;
        const edited = feedback.filter((f) => f.action === "edited").length;
        const rejected = feedback.filter((f) => f.action === "rejected").length;

        // Weight: accepted = +1, edited = +0.3, rejected = -0.5
        const weightedScore = (accepted * 1.0 + edited * 0.3 - rejected * 0.5) / feedback.length;

        // Map weighted score to calibration factor (0.7 to 1.1)
        const calibrationFactor = 0.9 + (weightedScore * 0.2);

        // Apply calibration
        const calibrated = Math.min(1, Math.max(0, rawConfidence * calibrationFactor));

        logStructured("info", "confidence_calibrated", {
            workspaceId,
            narrativeType,
            rawConfidence,
            calibrated: Number(calibrated.toFixed(3)),
            feedbackCount: feedback.length,
            acceptanceRate: Number((accepted / feedback.length).toFixed(3)),
        });

        return Number(calibrated.toFixed(3));
    } catch (error) {
        logStructured("error", "confidence_calibration_failed", { error: error.message });
        return rawConfidence;
    }
}

/**
 * Get confidence calibration statistics for a workspace.
 */
export async function getConfidenceStats(workspaceId) {
    try {
        const { data: feedback, error } = await supabase
            .from('ai_feedback')
            .select('action, created_at')
            .eq('workspace_id', workspaceId)
            .eq('target_type', 'signal_analysis')
            .order('created_at', { ascending: false })
            .limit(200);

        if (error || !feedback) {
            throw error || new Error('No feedback data');
        }

        const total = feedback.length;
        const accepted = feedback.filter((f) => f.action === "accepted").length;
        const edited = feedback.filter((f) => f.action === "edited").length;
        const rejected = feedback.filter((f) => f.action === "rejected").length;

        return {
            total,
            accepted,
            edited,
            rejected,
            acceptanceRate: total > 0 ? Number((accepted / total).toFixed(3)) : null,
            calibrationStatus: total < 5 ? "insufficient_data" : "active",
        };
    } catch (error) {
        return { total: 0, accepted: 0, edited: 0, rejected: 0, acceptanceRate: null, calibrationStatus: "error" };
    }
}
