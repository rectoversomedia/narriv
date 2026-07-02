import prisma from "../../prisma.js";
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
    const existing = await prisma.alert.findFirst({
        where: {
            workspaceId,
            type,
            title: { contains: topicKey, mode: "insensitive" },
            createdAt: { gte: windowStart }
        },
        select: { id: true }
    });

    return Boolean(existing);
}

export async function detectAlerts(workspaceId) {
    const alerts = [];
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const prev24h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const [recentSignals, previousSignals] = await Promise.all([
        prisma.signal.findMany({
            where: { workspaceId, capturedAt: { gte: last24h, lte: now } },
            orderBy: { capturedAt: "desc" },
            include: {
                analyses: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { confidenceScore: true, sentiment: true, impact: true }
                }
            }
        }),
        prisma.signal.count({
            where: { workspaceId, capturedAt: { gte: prev24h, lt: last24h } }
        })
    ]);

    if (recentSignals.length === 0) {
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
            const sent = s.analyses[0]?.sentiment || s.sentiment || "";
            return String(sent).toLowerCase() === "negative";
        }).length;

        const sentimentRatio = Math.round((negativeCount / countNow) * 100);
        const speed = previousSignals > 0 ? Math.round((countNow / previousSignals) * 100) : Math.min(100, countNow * 15);

        const avgSourceStrength = Math.round(
            (signals.reduce((sum, s) => sum + (SOURCE_STRENGTH[s.sourceType || "unknown"] || SOURCE_STRENGTH.unknown), 0) / countNow) * 100
        );

        const spread = Math.round(
            (new Set(signals.map((s) => (s.platform || "unknown").toLowerCase())).size / Math.max(1, countNow)) * 100
        );

        // Higher urgency when median capturedAt is recent.
        const medianTs = signals
            .map((s) => new Date(s.capturedAt).getTime())
            .sort((a, b) => a - b)[Math.floor(signals.length / 2)];
        const hoursAgo = Math.max(1, (now.getTime() - medianTs) / (1000 * 60 * 60));
        const timeToImpact = Math.max(20, Math.min(100, Math.round(100 - hoursAgo * 6)));

        const confidenceValues = signals
            .map((s) => s.analyses[0]?.confidenceScore)
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
            .map((s) => `[${(s.analyses[0]?.sentiment || s.sentiment || "unknown").toUpperCase()}] ${s.title || "No Title"}\n${s.content.substring(0, 150)}...`)
            .join("\n\n");

        const sources = [...new Set(signals.map((s) => s.platform).filter(Boolean))];

        const alertDataObj = {
            type,
            severity,
            title: `${topicKey} trend alert`,
            whatHappened: `Topic window score ${score}/100 (speed ${speed}, sentiment ${sentimentRatio}, source ${avgSourceStrength}, spread ${spread}, impact ETA ${timeToImpact}, confidence ${confidence}).`,
        };

        const enhanced = await enhanceAlert(alertDataObj, signalsContext);

        const newAlert = await prisma.alert.create({
            data: {
                workspaceId,
                type,
                severity,
                title: alertDataObj.title,
                whatHappened: alertDataObj.whatHappened,
                whyItMatters: enhanced?.whyItMatters || `Narrative momentum is increasing for topic '${topicKey}'.`,
                whatToDo: enhanced?.whatToDo || "Assign an owner, prepare response copy, and monitor the next 24h signal curve.",
                status: "open",
                sources,
            }
        });

        alerts.push(newAlert);
        globalEvents.emit("dashboard_update", workspaceId);
    }

    return alerts;
}

export async function escalateAlertsForWorkspace(workspaceId) {
    const now = new Date();
    let overdueEscalated = 0;
    let criticalRiskEscalated = 0;

    // Fetch escalation matrix for this workspace
    const escalationLevels = await prisma.escalationMatrix.findMany({
        where: { workspaceId, isActive: true },
        orderBy: { order: "asc" }
    });

    // Build role lookup: level -> { roleName, slaMinutes }
    const levelRoleMap = {};
    for (const level of escalationLevels) {
        levelRoleMap[level.level] = { roleName: level.roleName, slaMinutes: level.slaMinutes };
    }

    const overdueAlerts = await prisma.alert.findMany({
        where: {
            workspaceId,
            deadline: { lt: now },
            status: { not: "resolved" },
        },
        select: {
            id: true,
            escalationLevel: true,
            status: true,
            deadline: true,
            assignedTo: true,
            assignedTeam: true,
        }
    });

    for (const alert of overdueAlerts) {
        const nextLevel = nextEscalationLevel(alert.escalationLevel);
        if (nextLevel === alert.escalationLevel) continue;

        // Find the role for the next level from Escalation Matrix
        const nextRole = levelRoleMap[nextLevel] || levelRoleMap["high"] || { roleName: "Department Head", slaMinutes: 15 };

        const updated = await prisma.alert.update({
            where: { id: alert.id },
            data: {
                escalationLevel: nextLevel,
                workflowStatus: "blocked",
                assignedTeam: nextRole.roleName,
            }
        });

        overdueEscalated += 1;
        await prisma.auditLog.create({
            data: {
                workspaceId: updated.workspaceId,
                event: "alert_escalated_overdue",
                metadata: {
                    alertId: updated.id,
                    workspaceId: updated.workspaceId,
                    previousEscalationLevel: alert.escalationLevel,
                    escalationLevel: updated.escalationLevel,
                    assignedTeam: nextRole.roleName,
                    deadline: alert.deadline,
                    status: alert.status,
                }
            }
        });
        await prisma.auditLog.create({
            data: {
                workspaceId: updated.workspaceId,
                event: "escalation_change",
                metadata: {
                    targetType: "alert",
                    alertId: updated.id,
                    workspaceId: updated.workspaceId,
                    previousEscalationLevel: alert.escalationLevel,
                    escalationLevel: updated.escalationLevel,
                    assignedTeam: nextRole.roleName,
                    reason: "overdue_alert",
                }
            }
        });
    }

    const unresolvedCriticalRisks = await prisma.alert.findMany({
        where: {
            workspaceId,
            type: "risk",
            severity: "critical",
            status: { not: "resolved" },
            escalationLevel: { not: "critical" },
        },
        select: {
            id: true,
            escalationLevel: true,
            status: true,
        }
    });

    // Find the highest level role for critical alerts
    const criticalRole = escalationLevels.length > 0 
        ? escalationLevels[escalationLevels.length - 1] 
        : { roleName: "Executive Team", slaMinutes: 30 };

    for (const alert of unresolvedCriticalRisks) {
        const updated = await prisma.alert.update({
            where: { id: alert.id },
            data: {
                escalationLevel: "critical",
                workflowStatus: "blocked",
                assignedTeam: criticalRole.roleName,
            }
        });
        criticalRiskEscalated += 1;

        await prisma.auditLog.create({
            data: {
                workspaceId: updated.workspaceId,
                event: "alert_escalated_unresolved_critical_risk",
                metadata: {
                    alertId: updated.id,
                    workspaceId: updated.workspaceId,
                    previousEscalationLevel: alert.escalationLevel,
                    escalationLevel: updated.escalationLevel,
                    assignedTeam: criticalRole.roleName,
                    status: alert.status,
                    severity: "critical",
                    type: "risk",
                }
            }
        });
        await prisma.auditLog.create({
            data: {
                workspaceId: updated.workspaceId,
                event: "escalation_change",
                metadata: {
                    targetType: "alert",
                    alertId: updated.id,
                    workspaceId: updated.workspaceId,
                    previousEscalationLevel: alert.escalationLevel,
                    escalationLevel: updated.escalationLevel,
                    assignedTeam: criticalRole.roleName,
                    reason: "unresolved_critical_risk",
                }
            }
        });
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
