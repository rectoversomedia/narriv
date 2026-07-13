/**
 * Bulk Operations Service for Narriv
 * Handles batch operations for signals, alerts, and action plans
 */

import supabase from "./supabase.js";
import { logStructured } from "./logger.js";
import { dispatchWebhookEvent } from "./webhooks.js";
import { broadcastToWorkspace, SSE_EVENTS } from "./sse.js";

/**
 * Bulk delete signals
 */
export async function bulkDeleteSignals(workspaceId, signalIds) {
    if (!signalIds || signalIds.length === 0) {
        throw new Error("No signal IDs provided");
    }

    const { data, error } = await supabase
        .from("signals")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", signalIds)
        .eq("workspace_id", workspaceId)
        .select("id");

    if (error) {
        logStructured("error", "bulk_delete_signals_failed", { error: error.message });
        throw error;
    }

    logStructured("info", "bulk_delete_signals", {
        workspaceId,
        count: data?.length || 0,
        requested: signalIds.length,
    });

    // Broadcast update
    broadcastToWorkspace(workspaceId, SSE_EVENTS.DASHBOARD_REFRESH, {
        action: "signals_deleted",
        count: data?.length || 0,
    });

    return { deleted: data?.length || 0, requested: signalIds.length };
}

/**
 * Bulk update signals (add tags, update status)
 */
export async function bulkUpdateSignals(workspaceId, signalIds, updates) {
    if (!signalIds || signalIds.length === 0) {
        throw new Error("No signal IDs provided");
    }

    const { data, error } = await supabase
        .from("signals")
        .update(updates)
        .in("id", signalIds)
        .eq("workspace_id", workspaceId)
        .select("id");

    if (error) {
        logStructured("error", "bulk_update_signals_failed", { error: error.message });
        throw error;
    }

    logStructured("info", "bulk_update_signals", {
        workspaceId,
        count: data?.length || 0,
        updates,
    });

    broadcastToWorkspace(workspaceId, SSE_EVENTS.DASHBOARD_REFRESH, {
        action: "signals_updated",
        count: data?.length || 0,
    });

    return { updated: data?.length || 0, requested: signalIds.length };
}

/**
 * Bulk analyze signals
 */
export async function bulkAnalyzeSignals(workspaceId, signalIds, options = {}) {
    const { maxConcurrent = 5, skipAnalyzed = true } = options;

    // Fetch signals
    let query = supabase
        .from("signals")
        .select("*")
        .in("id", signalIds)
        .eq("workspace_id", workspaceId);

    if (skipAnalyzed) {
        query = query.is("sentiment", null);
    }

    const { data: signals, error } = await query;

    if (error) {
        logStructured("error", "bulk_analyze_fetch_failed", { error: error.message });
        throw error;
    }

    if (!signals || signals.length === 0) {
        return { queued: 0, skipped: signalIds.length };
    }

    // Import AI service dynamically to avoid circular deps
    const { addAnalysisJob } = await import("./queue.js");

    let queued = 0;
    for (const signal of signals) {
        try {
            await addAnalysisJob(signal.id);
            queued++;
        } catch (err) {
            logStructured("error", "bulk_analyze_queue_failed", {
                signalId: signal.id,
                error: err.message,
            });
        }
    }

    logStructured("info", "bulk_analyze_signals", {
        workspaceId,
        queued,
        total: signals.length,
    });

    return {
        queued,
        skipped: signalIds.length - signals.length,
        total: signals.length,
    };
}

/**
 * Bulk create alerts from signals
 */
export async function bulkCreateAlertsFromSignals(workspaceId, signalIds, alertData = {}) {
    const { data: signals, error } = await supabase
        .from("signals")
        .select("*")
        .in("id", signalIds)
        .eq("workspace_id", workspaceId);

    if (error) {
        throw error;
    }

    if (!signals || signals.length === 0) {
        return { created: 0 };
    }

    // Group signals by topic for batching
    const signalGroups = groupSignalsByTopic(signals);

    const alerts = [];
    for (const [topic, groupSignals] of Object.entries(signalGroups)) {
        if (groupSignals.length < 3) continue; // Minimum 3 signals per alert

        const negativeSignals = groupSignals.filter(
            (s) => s.sentiment === "negative" || s.sentiment === "mixed"
        );

        if (negativeSignals.length / groupSignals.length >= 0.3) {
            // 30% negative threshold
            const { data: alert, error: alertError } = await supabase
                .from("alerts")
                .insert({
                    workspace_id: workspaceId,
                    title: `Trend Alert: ${topic}`,
                    description: `${groupSignals.length} related signals detected`,
                    type: "risk",
                    severity: alertData.severity || "medium",
                    status: "new",
                    source: "bulk_creation",
                    metadata: {
                        signal_ids: groupSignals.map((s) => s.id),
                        signal_count: groupSignals.length,
                    },
                })
                .select()
                .single();

            if (!alertError && alert) {
                alerts.push(alert);

                // Dispatch webhook
                dispatchWebhookEvent(workspaceId, "alert.created", alert);

                // Broadcast to workspace
                broadcastToWorkspace(workspaceId, SSE_EVENTS.ALERT_CREATED, {
                    data: alert,
                });
            }
        }
    }

    logStructured("info", "bulk_create_alerts", {
        workspaceId,
        created: alerts.length,
        signalCount: signals.length,
    });

    return { created: alerts.length, alerts };
}

/**
 * Bulk update alerts
 */
export async function bulkUpdateAlerts(workspaceId, alertIds, updates) {
    const { data, error } = await supabase
        .from("alerts")
        .update(updates)
        .in("id", alertIds)
        .eq("workspace_id", workspaceId)
        .select("id, status, updated_at");

    if (error) {
        logStructured("error", "bulk_update_alerts_failed", { error: error.message });
        throw error;
    }

    // Dispatch events for each updated alert
    for (const alert of data || []) {
        if (updates.status) {
            dispatchWebhookEvent(workspaceId, "alert.status_changed", alert);
        }
        broadcastToWorkspace(workspaceId, SSE_EVENTS.ALERT_UPDATED, { data: alert });
    }

    logStructured("info", "bulk_update_alerts", {
        workspaceId,
        count: data?.length || 0,
        updates,
    });

    return { updated: data?.length || 0, requested: alertIds.length };
}

/**
 * Bulk assign alerts
 */
export async function bulkAssignAlerts(workspaceId, alertIds, assignment) {
    const { assigned_to, assigned_team, deadline } = assignment;

    const updates = {};
    if (assigned_to) updates.assigned_to = assigned_to;
    if (assigned_team) updates.assigned_team = assigned_team;
    if (deadline) updates.deadline = deadline;

    const { data, error } = await supabase
        .from("alerts")
        .update(updates)
        .in("id", alertIds)
        .eq("workspace_id", workspaceId)
        .select();

    if (error) {
        throw error;
    }

    logStructured("info", "bulk_assign_alerts", {
        workspaceId,
        count: data?.length || 0,
        assignment,
    });

    return { assigned: data?.length || 0 };
}

/**
 * Bulk update action plans
 */
export async function bulkUpdateActionPlans(workspaceId, planIds, updates) {
    const { data, error } = await supabase
        .from("action_plans")
        .update(updates)
        .in("id", planIds)
        .eq("workspace_id", workspaceId)
        .select();

    if (error) {
        throw error;
    }

    logStructured("info", "bulk_update_action_plans", {
        workspaceId,
        count: data?.length || 0,
    });

    return { updated: data?.length || 0 };
}

/**
 * Bulk send feedback for action plans
 */
export async function bulkFeedbackActionPlans(workspaceId, planIds, feedback) {
    const feedbackRecords = planIds.map((planId) => ({
        workspace_id: workspaceId,
        action_plan_id: planId,
        feedback_type: feedback.feedback_type || "accept",
        rating: feedback.rating,
        comment: feedback.comment,
    }));

    const { data, error } = await supabase.from("ai_feedback").insert(feedbackRecords).select();

    if (error) {
        throw error;
    }

    logStructured("info", "bulk_feedback_action_plans", {
        workspaceId,
        count: data?.length || 0,
    });

    return { feedback: data?.length || 0 };
}

/**
 * Group signals by topic keyword
 */
function groupSignalsByTopic(signals) {
    const groups = {};

    for (const signal of signals) {
        const text = `${signal.title || ""} ${signal.content || ""}`;
        const keywords = extractKeywords(text);

        if (keywords.length === 0) {
            // Uncategorized
            if (!groups["uncategorized"]) groups["uncategorized"] = [];
            groups["uncategorized"].push(signal);
        } else {
            // Group by first significant keyword
            const topic = keywords[0];
            if (!groups[topic]) groups[topic] = [];
            groups[topic].push(signal);
        }
    }

    return groups;
}

/**
 * Extract significant keywords from text
 */
function extractKeywords(text) {
    const stopWords = new Set([
        "the",
        "and",
        "a",
        "an",
        "is",
        "in",
        "to",
        "of",
        "for",
        "on",
        "with",
        "this",
        "that",
        "it",
        "are",
        "was",
        "be",
    ]);

    const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopWords.has(w));

    // Get unique significant words
    const unique = [...new Set(words)];
    return unique.slice(0, 3); // Return top 3 keywords
}

/**
 * Export signals to CSV (streaming for large datasets)
 */
export async function streamExportSignals(workspaceId, options = {}) {
    const { format = "csv", filters = {} } = options;

    let query = supabase
        .from("signals")
        .select("*")
        .eq("workspace_id", workspaceId);

    if (filters.platform) query = query.eq("platform", filters.platform);
    if (filters.sentiment) query = query.eq("sentiment", filters.sentiment);
    if (filters.dateFrom) query = query.gte("captured_at", filters.dateFrom);
    if (filters.dateTo) query = query.lte("captured_at", filters.dateTo);

    const { data, error } = await query;

    if (error) throw error;

    if (format === "csv") {
        const { exportSignalsToCSV } = await import("./export.js");
        return exportSignalsToCSV(data || []);
    }

    if (format === "json") {
        const { exportSignalsToJSON } = await import("./export.js");
        return exportSignalsToJSON(data || []);
    }

    return data;
}
