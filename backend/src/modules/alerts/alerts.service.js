import prisma from "../../prisma.js";
import { enhanceAlert } from "../ai/ai.service.js";

const SOURCE_STRENGTH = {
    news: 1,
    web: 0.7,
    forum: 0.6,
    social: 0.7,
    video: 0.8,
    podcast: 0.75,
    unknown: 0.5,
};

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
            }
        });

        alerts.push(newAlert);
    }

    return alerts;
}
