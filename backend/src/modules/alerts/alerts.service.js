import supabase from "../../lib/supabase.js";
import { enhanceAlert } from "../ai/ai.service.js";
import { globalEvents } from "../app-notifications/app-notifications.events.js";
import { logStructured } from "../../lib/logger.js";

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

export async function detectAlerts(workspaceId) {
    const alerts = [];
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const prev24h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Fetch recent signals with analyses
    const { data: recentSignals, error: signalsError } = await supabase
        .from('signals')
        .select(`
            *,
            analyses (
                confidence_score,
                sentiment,
                impact
            )
        `)
        .eq('workspace_id', workspaceId)
        .gte('captured_at', last24h.toISOString())
        .lte('captured_at', now.toISOString())
        .order('captured_at', { ascending: false });

    if (signalsError) {
        logStructured("error", "Error fetching signals for alert detection:", { error: signalsError?.message || signalsError });
        return alerts;
    }

    // Count previous signals
    const { count: previousSignals } = await supabase
        .from('signals')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .gte('captured_at', prev24h.toISOString())
        .lt('captured_at', last24h.toISOString());

    if (!recentSignals || recentSignals.length === 0) {
        return alerts;
    }

    const topicBuckets = new Map();
    for (const signal of recentSignals) {
        const key = buildTopicKey(signal);
        if (!topicBuckets.has(key)) topicBuckets.set(key, []);
        topicBuckets.get(key).push(signal);
    }

    for (const [topicKey, signals] of topicBuckets.entries()) {
        const countNow = signals.length;
        if (countNow < 3) continue;

        const negativeCount = signals.filter((s) => {
            const sent = s.analyses?.[0]?.sentiment || s.sentiment || "";
            return String(sent).toLowerCase() === "negative";
        }).length;

        const sentimentRatio = Math.round((negativeCount / countNow) * 100);
        const speed = previousSignals > 0 ? Math.round((countNow / previousSignals) * 100) : Math.min(100, countNow * 15);

        const avgSourceStrength = Math.round(
            (signals.reduce((sum, s) => sum + (SOURCE_STRENGTH[s.source_type || "unknown"] || SOURCE_STRENGTH.unknown), 0) / countNow) * 100
        );

        const spread = Math.round(
            (new Set(signals.map((s) => (s.platform || "unknown").toLowerCase())).size / Math.max(1, countNow)) * 100
        );

        // Higher urgency when median capturedAt is recent.
        const medianTs = signals
            .map((s) => new Date(s.captured_at).getTime())
            .sort((a, b) => a - b)[Math.floor(signals.length / 2)];
        const hoursAgo = Math.max(1, (now.getTime() - medianTs) / (1000 * 60 * 60));
        const timeToImpact = Math.max(20, Math.min(100, Math.round(100 - hoursAgo * 6)));

        const confidenceValues = signals
            .map((s) => s.analyses?.[0]?.confidence_score)
            .filter((v) => typeof v === "number");
        const confidence = confidenceValues.length > 0
            ? Math.round((confidenceValues.reduce((sum, v) => sum + v, 0) / confidenceValues.length) * 100)
            : 60;

        const score = computeAlertScore({
            speed,
            sentimentRatio,
            sourceStrength: avgSourceStrength,
            spread,
            timeToImpact,
            confidence,
        });

        if (score < 45) continue;

        const type = sentimentRatio >= 50 ? "risk" : "positioning";
        const severity = toSeverity(score);

        const duplicate = await hasDuplicateAlert({
            workspaceId,
            type,
            topicKey,
            windowStart: last24h,
        });
        if (duplicate) continue;

        const topSignals = signals.slice(0, 5);
        const signalsContext = topSignals
            .map((s) => `[${(s.analyses?.[0]?.sentiment || s.sentiment || "unknown").toUpperCase()}] ${s.title || "No Title"}\n${(s.content || "").substring(0, 150)}...`)
            .join("\n\n");

        const sources = [...new Set(signals.map((s) => s.platform).filter(Boolean))];

        const alertDataObj = {
            type,
            severity,
            title: `${topicKey} trend alert`,
            whatHappened: `Topic window score ${score}/100 (speed ${speed}, sentiment ${sentimentRatio}, source ${avgSourceStrength}, spread ${spread}, impact ETA ${timeToImpact}, confidence ${confidence}).`,
        };

        const enhanced = await enhanceAlert(alertDataObj, signalsContext);

        const { data: newAlert, error: createError } = await supabase
            .from('alerts')
            .insert({
                workspace_id: workspaceId,
                type,
                severity,
                title: alertDataObj.title,
                what_happened: alertDataObj.whatHappened,
                why_it_matters: enhanced?.whyItMatters || `Narrative momentum is increasing for topic '${topicKey}'.`,
                what_to_do: enhanced?.whatToDo || "Assign an owner, prepare response copy, and monitor the next 24h signal curve.",
                status: "open",
                sources,
            })
            .select()
            .single();

        if (!createError && newAlert) {
            alerts.push(newAlert);
            globalEvents.emit("dashboard_update", workspaceId);
        } else if (createError) {
            logStructured("error", "Error creating alert:", { error: createError?.message || createError });
        }
    }

    return alerts;
}

export async function escalateAlertsForWorkspace(workspaceId) {
    const now = new Date();
    let overdueEscalated = 0;
    let criticalRiskEscalated = 0;

    // Fetch escalation matrix for this workspace
    const { data: escalationLevels } = await supabase
        .from('escalation_matrices')
        .select('level, role_name, sla_minutes')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('order', { ascending: true });

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
                workflow_status: "blocked",
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
                workflow_status: "blocked",
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
