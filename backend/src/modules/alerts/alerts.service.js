import supabase from "../../lib/supabase.js";
import { enhanceAlert } from "../ai/ai.service.js";
import { globalEvents } from "../app-notifications/app-notifications.events.js";
import { logStructured } from "../../lib/logger.js";
import { workspaceLanguage } from "../../lib/workspace-language.js";
import { dispatchAlertToWebhooks } from "../integrations/webhook-dispatcher.service.js";
import { DEMO_WORKSPACE_ID } from "../../lib/workspace-access.js";

const SOURCE_STRENGTH = {
    news: 1,
    web: 0.7,
    forum: 0.6,
    social: 0.7,
    video: 0.8,
    podcast: 0.75,
    unknown: 0.5,
};

const ESCALATION_ORDER = ["low", "medium", "high", "critical"];

function nextEscalationLevel(currentLevel) {
    const currentIndex = ESCALATION_ORDER.indexOf((currentLevel || "low").toLowerCase());
    if (currentIndex < 0) return "medium";
    return ESCALATION_ORDER[Math.min(currentIndex + 1, ESCALATION_ORDER.length - 1)];
}

function toSeverity(score) {
    if (score >= 80) return "critical";
    if (score >= 65) return "high";
    if (score >= 45) return "medium";
    return "low";
}

function buildTopicKey(signal) {
    const text = (signal.title || signal.content || "untitled").toLowerCase();
    return text
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 6)
        .join("-") || "general-topic";
}

function computeAlertScore({ speed, sentimentRatio, sourceStrength, spread, timeToImpact, confidence }) {
    const score =
        speed * 0.22 +
        sentimentRatio * 0.22 +
        sourceStrength * 0.16 +
        spread * 0.14 +
        timeToImpact * 0.14 +
        confidence * 0.12;

    return Math.max(0, Math.min(100, Math.round(score)));
}

async function hasDuplicateAlert({ workspaceId, type, topicKey, windowStart }) {
    const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('type', type)
        .ilike('title', `%${topicKey}%`)
        .gte('created_at', windowStart.toISOString())
        .limit(1);

    return Boolean(existing && existing.length > 0);
}

// AI sentiment lives in signal_analyses.analysis; fall back to signals.sentiment.
export function signalSentiment(signal) {
    const fromAnalysis = signal.analyses?.[0]?.analysis?.sentiment;
    return String(fromAnalysis || signal.sentiment || "").toUpperCase();
}

/**
 * Dispatch an alert to the workspace's active integrations and store the
 * delivery summary in alerts.metadata.notification.
 */
export async function notifyAndRecord(alert) {
    let result;
    try {
        result = await dispatchAlertToWebhooks(alert);
    } catch (err) {
        result = { dispatched: 0, total: 0, results: [], error: err.message };
    }
    // Critical and high alerts also go straight to the people: email (notification email, else the owners) and
    // WhatsApp when switched on. Sent once per alert (a webhook retry does not resend), never from the demo.
    let direct = alert.metadata?.notification?.direct || null;
    if (!direct && ["critical", "high"].includes(String(alert.severity).toLowerCase()) && alert.workspace_id !== DEMO_WORKSPACE_ID) {
        try {
            const { notifyNewHighRiskAlert } = await import("../notifications/notification-dispatch.service.js");
            const r = await notifyNewHighRiskAlert({
                workspaceId: alert.workspace_id,
                alertId: alert.id,
                title: alert.title,
                severity: String(alert.severity).toLowerCase(),
                whatHappened: alert.what_happened || alert.whatHappened || null,
                whatToDo: alert.what_to_do || alert.whatToDo || null,
            });
            direct = { at: new Date().toISOString(), delivered: r.delivered, channels: (r.results || []).map((x) => ({ provider: x.provider, delivered: x.delivered })) };
        } catch (err) {
            direct = { at: new Date().toISOString(), delivered: false, error: String(err?.message || err).slice(0, 160) };
            logStructured("warn", "alert_direct_notify_failed", { alertId: alert.id, error: err?.message || err });
        }
    }
    const failed = (result.results || []).filter((r) => r.status === "failed");
    const notification = {
        status: result.error ? "error" : result.total === 0 ? "no_active_integrations" : failed.length > 0 ? "failed" : "delivered",
        delivered: result.dispatched || 0,
        total: result.total || 0,
        failedIntegrationIds: failed.map((r) => r.integrationId),
        attempts: (alert.metadata?.notification?.attempts || 0) + 1,
        lastAttemptAt: new Date().toISOString(),
        ...(direct ? { direct } : {}),
    };
    const { error } = await supabase
        .from("alerts")
        .update({ metadata: { ...(alert.metadata || {}), notification } })
        .eq("id", alert.id)
        .eq("workspace_id", alert.workspace_id);
    if (error) logStructured("warn", "alert_notification_record_failed", { alertId: alert.id, error: error.message });
    if (notification.status === "failed" || notification.status === "error") {
        logStructured("warn", "alert_notification_failed", { alertId: alert.id, ...notification });
    }
    return notification;
}

/**
 * Retry notifications for recent alerts whose last delivery failed.
 * Bounded to 3 attempts per alert; scoped to one workspace.
 */
export async function retryFailedNotifications(workspaceId, { maxAttempts = 3, lookbackHours = 24 } = {}) {
    const since = new Date(Date.now() - lookbackHours * 3600 * 1000).toISOString();
    const { data: alerts, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("created_at", since)
        .in("metadata->notification->>status", ["failed", "error"])
        .limit(50);
    if (error) {
        logStructured("warn", "alert_notification_retry_query_failed", { workspaceId, error: error.message });
        return { retried: 0, error: error.message };
    }
    let retried = 0;
    for (const alert of alerts || []) {
        if ((alert.metadata?.notification?.attempts || 0) >= maxAttempts) continue;
        await notifyAndRecord(alert);
        retried += 1;
    }
    return { retried };
}

// One alert-rules pass per workspace at a time. The scheduler ingests several keywords of a workspace side by side
// and each one runs the rules; run concurrently, two passes both found no open alert for a topic and both raised one
// (identical alerts one second apart). Passes for the same workspace now queue behind each other.
const detectQueue = new Map();

export function detectAlerts(workspaceId) {
    const previous = detectQueue.get(workspaceId) || Promise.resolve();
    const current = previous.catch(() => {}).then(() => detectAlertsNow(workspaceId));
    detectQueue.set(workspaceId, current);
    current.finally(() => { if (detectQueue.get(workspaceId) === current) detectQueue.delete(workspaceId); }).catch(() => {});
    return current;
}

async function detectAlertsNow(workspaceId) {
    const alerts = [];
    const now = new Date();
    // 6-hour immediate window, 24-hour baseline window
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Fetch recent signals with analyses
    const { data: recentSignals, error: signalsError } = await supabase
        .from('signals')
        .select(`
            id,
            workspace_id,
            title,
            content,
            platform,
            sentiment,
            severity,
            topics,
            metadata,
            captured_at,
            analyses:signal_analyses (
                confidence,
                analysis
            )
        `)
        .eq('workspace_id', workspaceId)
        .gte('captured_at', twentyFourHoursAgo.toISOString())
        .order('captured_at', { ascending: false });

    if (signalsError) {
        logStructured("error", "Error fetching signals for alert detection:", { error: signalsError?.message || signalsError });
        return alerts;
    }

    if (!recentSignals || recentSignals.length === 0) {
        return alerts;
    }

    // Group signals by target keyword or primary topic
    const topicBuckets = new Map();
    for (const signal of recentSignals) {
        const key = signal.metadata?.keyword || (Array.isArray(signal.topics) && signal.topics[0]) || buildTopicKey(signal);
        const normalizedKey = String(key).trim();
        if (!topicBuckets.has(normalizedKey)) topicBuckets.set(normalizedKey, []);
        topicBuckets.get(normalizedKey).push(signal);
    }

    for (const [topicKey, signals] of topicBuckets.entries()) {
        const totalCount = signals.length;
        if (totalCount < 2) continue;

        // Negative signals
        const negativeSignals = signals.filter((s) => signalSentiment(s) === "NEGATIVE");
        const negativeCount = negativeSignals.length;
        const negativeRatio = (negativeCount / totalCount) * 100;
        const roundedRatio = Math.round(negativeRatio);

        // Recent 6-hour signals
        const recent6hSignals = signals.filter(s => new Date(s.captured_at) >= sixHoursAgo);
        const recent6hNegatives = recent6hSignals.filter((s) => signalSentiment(s) === "NEGATIVE");
        const recent6hNegRatio = recent6hSignals.length > 0 
            ? (recent6hNegatives.length / recent6hSignals.length) * 100 
            : 0;

        const hasCritical = signals.some(s => String(s.severity).toLowerCase() === "critical");
        const hasHigh = signals.some(s => String(s.severity).toLowerCase() === "high");

        // Rule condition:
        // 1. Negative ratio >= 30% in recent 6h window or 24h window (with at least 1 negative signal)
        // OR 2. Severe volume surge (>= 3 negative signals)
        // OR 3. Critical severity signal with negative sentiment
        const isTriggered = (recent6hNegRatio >= 30 && recent6hNegatives.length >= 1) ||
                            (negativeRatio >= 30 && negativeCount >= 1) ||
                            negativeCount >= 3 ||
                            (hasCritical && negativeCount >= 1);

        if (!isTriggered) continue;

        // Deduplication: while an unresolved alert for this topic exists (of any age), the issue is still the
        // same one, so it is refreshed instead of raised again. A 7-day look-back used to re-raise an issue
        // that stayed open for more than a week, stacking identical alerts. Titles in either language
        // ("Negative Sentiment Spike: X" / "Lonjakan Sentimen Negatif: X") contain the topic.
        const { data: existingAlerts, error: dedupErr } = await supabase
            .from('alerts')
            .select('id, status, created_at, metadata')
            .eq('workspace_id', workspaceId)
            .ilike('title', `%${topicKey}%`)
            .neq('status', 'resolved')
            .order('created_at', { ascending: false })
            .limit(1);

        if (dedupErr) {
            logStructured("warn", "alert_rules_dedup_check_failed", { topicKey, error: dedupErr.message });
            continue;
        }
        if (existingAlerts && existingAlerts.length > 0) {
            const existing = existingAlerts[0];
            await supabase.from('alerts').update({
                metadata: {
                    ...(existing.metadata || {}),
                    negative_count: negativeCount,
                    total_count: totalCount,
                    negative_ratio: roundedRatio,
                    last_detected_at: now.toISOString(),
                },
            }).eq('id', existing.id);
            logStructured("info", "alert_rules_duplicate_refreshed", { topicKey, existingAlertId: existing.id });
            continue;
        }

        // Calculate severity
        let severity = "medium";
        if (negativeRatio >= 50 || hasCritical || negativeCount >= 4) {
            severity = "critical";
        } else if (negativeRatio >= 35 || hasHigh || negativeCount >= 2) {
            severity = "high";
        }

        const sources = Array.from(new Set(signals.map((s) => s.platform).filter(Boolean)));
        // Stored once and read by every member, so written in the workspace's content language.
        const id = (await workspaceLanguage(workspaceId)) === "id";
        const title = id ? `Lonjakan Sentimen Negatif: ${topicKey}` : `Negative Sentiment Spike: ${topicKey}`;
        const description = id
            ? `${negativeCount} dari ${totalCount} percakapan terbaru (${roundedRatio}%) bernada negatif untuk ${topicKey}.`
            : `${negativeCount} of ${totalCount} recent signals (${roundedRatio}%) are negative for ${topicKey}.`;
        const whatHappened = id
            ? `Aturan otomatis mendeteksi lonjakan sentimen negatif yang tajam (${roundedRatio}%, ${negativeCount}/${totalCount} percakapan) terkait '${topicKey}' dalam periode pemantauan terakhir.`
            : `Automated rules engine detected an acute negative sentiment surge (${roundedRatio}%, ${negativeCount}/${totalCount} signals) concerning '${topicKey}' within the recent monitoring window.`;
        const defaultWhy = id
            ? `Lonjakan sentimen negatif yang terkonsentrasi mengancam kepercayaan terhadap brand dan menandakan krisis yang bisa membesar, sehingga perlu dipantau tim PR segera.`
            : `A concentrated negative sentiment surge threatens brand trust and indicates an escalating crisis requiring immediate PR monitoring.`;
        const defaultAction = id
            ? `Tinjau percakapan yang masuk, siapkan pernyataan klarifikasi atau tanggapan sementara, dan tunjuk penanggung jawab insiden.`
            : `Review incoming signals, draft a clarifying statement or holding response, and assign an incident lead.`;

        // Attempt AI enhancement if available
        let whyItMatters = defaultWhy;
        let whatToDo = defaultAction;
        try {
            const signalsContext = negativeSignals.slice(0, 5)
                .map((s) => `[NEGATIVE] ${s.title || "No Title"}\n${(s.content || "").substring(0, 150)}...`)
                .join("\n\n");
            const enhanced = await enhanceAlert({
                type: "risk",
                severity,
                title,
                whatHappened,
            }, signalsContext);
            if (enhanced?.whyItMatters) whyItMatters = enhanced.whyItMatters;
            if (enhanced?.whatToDo) whatToDo = enhanced.whatToDo;
        } catch (aiErr) {
            logStructured("warn", "alert_ai_enhancement_fallback", { error: aiErr.message });
        }

        const { data: newAlert, error: createError } = await supabase
            .from('alerts')
            .insert({
                workspace_id: workspaceId,
                type: "risk",
                severity,
                title,
                description,
                what_happened: whatHappened,
                why_it_matters: whyItMatters,
                what_to_do: whatToDo,
                status: "open",
                sources: sources.length > 0 ? sources : ["news"],
                source: sources[0] || "news",
                metadata: {
                    keyword: topicKey,
                    negative_count: negativeCount,
                    total_count: totalCount,
                    negative_ratio: roundedRatio,
                    signal_ids: negativeSignals.map(s => s.id),
                    rule_triggered: "negative_sentiment_spike_30pct",
                    detected_at: now.toISOString(),
                }
            })
            .select()
            .single();

        if (!createError && newAlert) {
            // Another process (a manual run during the hourly one) may have raised the same topic at the same moment:
            // keep the oldest open alert and drop this one.
            const { data: twins } = await supabase
                .from('alerts')
                .select('id, created_at')
                .eq('workspace_id', workspaceId)
                .eq('title', title)
                .neq('status', 'resolved')
                .order('created_at', { ascending: true })
                .limit(2);
            if (twins && twins.length > 1 && twins[0].id !== newAlert.id) {
                await supabase.from('alerts').delete().eq('id', newAlert.id);
                logStructured("info", "alert_rules_duplicate_dropped", { topicKey, keptAlertId: twins[0].id });
                continue;
            }
            alerts.push(newAlert);
            logStructured("info", "alert_created_by_rules_engine", {
                alertId: newAlert.id,
                topicKey,
                severity,
                negativeRatio: roundedRatio,
            });
            globalEvents.emit("dashboard_update", workspaceId);
            // Await delivery (serverless may freeze after the response) and record
            // the outcome on the alert so failed notifications stay visible.
            await notifyAndRecord(newAlert);
        } else if (createError) {
            logStructured("error", "Error creating alert from rules engine:", { error: createError.message });
        }
    }

    return alerts;
}

export async function escalateAlertsForWorkspace(workspaceId) {
    const now = new Date();
    let overdueEscalated = 0;
    let criticalRiskEscalated = 0;

    // Fetch escalation matrix for this workspace
    // role_name may not exist yet (migration 029); select("*") keeps this working either way.
    const { data: escalationLevels } = await supabase
        .from('escalation_matrices')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    // Build role lookup: level -> { roleName, slaMinutes }
    const levelRoleMap = {};
    for (const level of escalationLevels || []) {
        levelRoleMap[level.level] = { roleName: level.role_name, slaMinutes: level.sla_minutes };
    }

    // Fetch overdue alerts
    const { data: overdueAlerts } = await supabase
        .from('alerts')
        .select('id, escalation_level, status, deadline, assigned_to, assigned_team')
        .eq('workspace_id', workspaceId)
        .lt('deadline', now.toISOString())
        .neq('status', 'resolved');

    for (const alert of overdueAlerts || []) {
        const nextLevel = nextEscalationLevel(alert.escalation_level);
        if (nextLevel === alert.escalation_level) continue;

        // Find the role for the next level from Escalation Matrix
        const nextRole = levelRoleMap[nextLevel] || levelRoleMap["high"] || { roleName: "Department Head", slaMinutes: 15 };

        const { data: updated } = await supabase
            .from('alerts')
            .update({
                escalation_level: nextLevel,
                assigned_team: nextRole.roleName,
            })
            .eq('id', alert.id)
            .select('id, workspace_id, escalation_level')
            .single();

        if (updated) {
            overdueEscalated += 1;
            await supabase.from('audit_logs').insert({
                workspace_id: updated.workspace_id,
                event: "alert_escalated_overdue",
                metadata: {
                    alert_id: updated.id,
                    workspace_id: updated.workspace_id,
                    previous_escalation_level: alert.escalation_level,
                    escalation_level: updated.escalation_level,
                    assigned_team: nextRole.roleName,
                    deadline: alert.deadline,
                    status: alert.status,
                }
            });
            await supabase.from('audit_logs').insert({
                workspace_id: updated.workspace_id,
                event: "escalation_change",
                metadata: {
                    target_type: "alert",
                    alert_id: updated.id,
                    workspace_id: updated.workspace_id,
                    previous_escalation_level: alert.escalation_level,
                    escalation_level: updated.escalation_level,
                    assigned_team: nextRole.roleName,
                    reason: "overdue_alert",
                }
            });
        }
    }

    // Fetch unresolved critical risks
    const { data: unresolvedCriticalRisks } = await supabase
        .from('alerts')
        .select('id, escalation_level, status')
        .eq('workspace_id', workspaceId)
        .eq('type', 'risk')
        .eq('severity', 'critical')
        .neq('status', 'resolved')
        .neq('escalation_level', 'critical');

    // Find the highest level role for critical alerts
    const criticalRole = (escalationLevels?.length || 0) > 0
        ? escalationLevels[escalationLevels.length - 1]
        : { role_name: "Executive Team", sla_minutes: 30 };

    for (const alert of unresolvedCriticalRisks || []) {
        const { data: updated } = await supabase
            .from('alerts')
            .update({
                escalation_level: "critical",
                assigned_team: criticalRole.role_name,
            })
            .eq('id', alert.id)
            .select('id, workspace_id, escalation_level')
            .single();

        if (updated) {
            criticalRiskEscalated += 1;

            await supabase.from('audit_logs').insert({
                workspace_id: updated.workspace_id,
                event: "alert_escalated_unresolved_critical_risk",
                metadata: {
                    alert_id: updated.id,
                    workspace_id: updated.workspace_id,
                    previous_escalation_level: alert.escalation_level,
                    escalation_level: updated.escalation_level,
                    assigned_team: criticalRole.role_name,
                    status: alert.status,
                    severity: "critical",
                    type: "risk",
                }
            });
            await supabase.from('audit_logs').insert({
                workspace_id: updated.workspace_id,
                event: "escalation_change",
                metadata: {
                    target_type: "alert",
                    alert_id: updated.id,
                    workspace_id: updated.workspace_id,
                    previous_escalation_level: alert.escalation_level,
                    escalation_level: updated.escalation_level,
                    assigned_team: criticalRole.role_name,
                    reason: "unresolved_critical_risk",
                }
            });
        }
    }

    const summary = {
        workspaceId,
        overdueEscalated,
        criticalRiskEscalated,
        totalEscalated: overdueEscalated + criticalRiskEscalated,
    };
    logStructured("info", "escalation_workspace_complete", summary);
    return summary;
}
