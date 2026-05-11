import OpenAI from "openai";
import prisma from "../../prisma.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const client = new OpenAI({
    apiKey: OPENAI_API_KEY || "sk-placeholder",
});

const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 20000);
const OPENAI_MAX_RETRIES = 1;

function logStructured(level, event, payload = {}) {
    const entry = {
        level,
        event,
        module: "actions.ai",
        timestamp: new Date().toISOString(),
        ...payload,
    };
    const line = JSON.stringify(entry);
    if (level === "error") {
        console.error(line);
    } else if (level === "warn") {
        console.warn(line);
    } else {
        console.log(line);
    }
}

function isAbortError(error) {
    return error?.name === "AbortError" || String(error?.message || "").toLowerCase().includes("aborted");
}

async function callOpenAIWithTimeout(messages, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages,
            temperature: 0.7,
            max_tokens: 800,
            response_format: { type: "json_object" },
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

async function callOpenAIWithRetry(messages, context) {
    let lastError = null;
    const maxAttempts = OPENAI_MAX_RETRIES + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const startedAt = Date.now();
        try {
            const response = await callOpenAIWithTimeout(messages, OPENAI_TIMEOUT_MS);
            logStructured("info", "openai_call_success", {
                ...context,
                attempt,
                latencyMs: Date.now() - startedAt,
            });
            return response;
        } catch (error) {
            lastError = error;
            const willRetry = attempt < maxAttempts;
            logStructured(willRetry ? "warn" : "error", "openai_call_failed", {
                ...context,
                attempt,
                willRetry,
                timeoutMs: OPENAI_TIMEOUT_MS,
                aborted: isAbortError(error),
                error: error?.message || "Unknown error",
            });
            if (!willRetry) break;
        }
    }

    throw lastError;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

const STRATEGY_PROMPTS = {
    pr_response: {
        system: `You are an expert PR strategist. Generate a professional PR response strategy.
Return ONLY a raw JSON object with these fields:
{
  "title": "<strategy title>",
  "executive_summary": "<2-3 sentence overview>",
  "key_messages": ["<message 1>", "<message 2>", "<message 3>"],
  "talking_points": ["<point 1>", "<point 2>", "<point 3>"],
  "media_channels": ["<channel 1>", "<channel 2>"],
  "timeline": "<recommended timeline>",
  "risk_considerations": "<potential risks to watch>"
}`,
        user: (context) => `Based on the following intelligence context, generate a PR response strategy:\n\n${context}`
    },
    content_strategy: {
        system: `You are a content strategy expert. Generate a comprehensive content strategy plan.
Return ONLY a raw JSON object with these fields:
{
  "title": "<strategy title>",
  "executive_summary": "<2-3 sentence overview>",
  "content_pillars": ["<pillar 1>", "<pillar 2>", "<pillar 3>"],
  "recommended_formats": ["<format 1>", "<format 2>", "<format 3>"],
  "distribution_channels": ["<channel 1>", "<channel 2>"],
  "key_themes": ["<theme 1>", "<theme 2>", "<theme 3>"],
  "publishing_cadence": "<recommended frequency>",
  "success_metrics": ["<metric 1>", "<metric 2>"]
}`,
        user: (context) => `Based on the following intelligence context, generate a content strategy:\n\n${context}`
    },
    influencer_strategy: {
        system: `You are an influencer marketing strategist. Generate an influencer engagement strategy.
Return ONLY a raw JSON object with these fields:
{
  "title": "<strategy title>",
  "executive_summary": "<2-3 sentence overview>",
  "target_influencer_profile": "<ideal influencer description>",
  "engagement_approach": "<how to approach and engage>",
  "collaboration_formats": ["<format 1>", "<format 2>", "<format 3>"],
  "key_messages_for_influencers": ["<message 1>", "<message 2>"],
  "platforms": ["<platform 1>", "<platform 2>"],
  "budget_consideration": "<budget guidance>",
  "success_metrics": ["<metric 1>", "<metric 2>"]
}`,
        user: (context) => `Based on the following intelligence context, generate an influencer strategy:\n\n${context}`
    },
    crisis_response: {
        system: `You are a crisis communications expert. Generate an urgent crisis response plan.
Return ONLY a raw JSON object with these fields:
{
  "title": "<crisis response title>",
  "severity_assessment": "<critical | high | medium | low>",
  "executive_summary": "<2-3 sentence crisis overview>",
  "immediate_actions": ["<action 1>", "<action 2>", "<action 3>"],
  "holding_statement": "<draft holding statement for media>",
  "internal_communication": "<key internal messaging>",
  "stakeholder_management": ["<stakeholder action 1>", "<stakeholder action 2>"],
  "monitoring_plan": "<what to monitor going forward>",
  "recovery_timeline": "<expected timeline to resolution>"
}`,
        user: (context) => `Based on the following intelligence context, generate a crisis response plan:\n\n${context}`
    }
};

function toStringOrFallback(value, fallback = "") {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    return trimmed || fallback;
}

function toStringArray(value, fallback = []) {
    if (!Array.isArray(value)) return fallback;
    const normalized = value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
    return normalized.length > 0 ? normalized : fallback;
}

function toPlanSteps(primaryList, fallbackList) {
    const steps = toStringArray(primaryList, fallbackList).slice(0, 4);
    const timelineSlots = ["Today", "Next 6h", "24h", "48h"];
    return steps.map((step, index) => [step, timelineSlots[index] || "Later"]);
}

function normalizeStrategyOutput(strategyType, raw, toneSuffix) {
    const commonTitle = toStringOrFallback(raw?.title, `${formatStrategyName(strategyType)} (${toneSuffix})`);
    const commonSummary = toStringOrFallback(raw?.executive_summary, "Action summary will be refined by the team.");

    if (strategyType === "pr_response") {
        const keyMessages = toStringArray(raw?.key_messages, ["Acknowledge concerns", "State verified facts", "Commit to follow-up"]);
        const talkingPoints = toStringArray(raw?.talking_points, ["Prepare spokesperson points", "Align with legal/comms", "Issue approved statement"]);
        const mediaChannels = toStringArray(raw?.media_channels, ["Press release", "Owned channels"]);
        const timeline = toStringOrFallback(raw?.timeline, "Initial response within 24 hours");
        const riskConsiderations = toStringOrFallback(raw?.risk_considerations, "Monitor narrative spread and stakeholder sentiment.");

        return {
            title: commonTitle,
            executive_summary: commonSummary,
            key_messages: keyMessages,
            talking_points: talkingPoints,
            media_channels: mediaChannels,
            timeline,
            risk_considerations: riskConsiderations,
            outputs: [
                ["Primary action", commonTitle],
                ["Channel", mediaChannels.join(", ")],
                ["Timeline", timeline],
                ["Risk", riskConsiderations],
            ],
            plan: toPlanSteps(talkingPoints, keyMessages),
        };
    }

    if (strategyType === "content_strategy") {
        const pillars = toStringArray(raw?.content_pillars, ["Clarify key narrative", "Address audience concerns", "Show evidence-led updates"]);
        const formats = toStringArray(raw?.recommended_formats, ["Short post", "Carousel", "FAQ article"]);
        const channels = toStringArray(raw?.distribution_channels, ["Owned social", "Website"]);
        const themes = toStringArray(raw?.key_themes, ["Transparency", "Consistency", "Actionability"]);
        const cadence = toStringOrFallback(raw?.publishing_cadence, "Daily for 3 days, then bi-weekly.");
        const metrics = toStringArray(raw?.success_metrics, ["Engagement rate", "Sentiment lift"]);

        return {
            title: commonTitle,
            executive_summary: commonSummary,
            content_pillars: pillars,
            recommended_formats: formats,
            distribution_channels: channels,
            key_themes: themes,
            publishing_cadence: cadence,
            success_metrics: metrics,
            outputs: [
                ["Primary action", commonTitle],
                ["Channel", channels.join(", ")],
                ["Cadence", cadence],
                ["Metrics", metrics.join(", ")],
            ],
            plan: toPlanSteps(pillars, themes),
        };
    }

    if (strategyType === "influencer_strategy") {
        const profile = toStringOrFallback(raw?.target_influencer_profile, "Relevant creator aligned to brand audience.");
        const approach = toStringOrFallback(raw?.engagement_approach, "Start with transparent context and collaboration brief.");
        const collabFormats = toStringArray(raw?.collaboration_formats, ["Story mention", "Q&A session", "Co-created post"]);
        const messages = toStringArray(raw?.key_messages_for_influencers, ["Use verified facts", "Maintain neutral tone"]);
        const platforms = toStringArray(raw?.platforms, ["Instagram", "TikTok"]);
        const budget = toStringOrFallback(raw?.budget_consideration, "Prioritize mid-tier creators with high trust.");
        const metrics = toStringArray(raw?.success_metrics, ["Reach quality", "Audience sentiment"]);

        return {
            title: commonTitle,
            executive_summary: commonSummary,
            target_influencer_profile: profile,
            engagement_approach: approach,
            collaboration_formats: collabFormats,
            key_messages_for_influencers: messages,
            platforms,
            budget_consideration: budget,
            success_metrics: metrics,
            outputs: [
                ["Primary action", commonTitle],
                ["Platforms", platforms.join(", ")],
                ["Approach", approach],
                ["Metrics", metrics.join(", ")],
            ],
            plan: toPlanSteps(collabFormats, messages),
        };
    }

    const severity = toStringOrFallback(raw?.severity_assessment, "high");
    const immediateActions = toStringArray(raw?.immediate_actions, ["Acknowledge issue", "Publish holding statement", "Activate response team"]);
    const holdingStatement = toStringOrFallback(raw?.holding_statement, "We are aware of the situation and are actively addressing it.");
    const internalCommunication = toStringOrFallback(raw?.internal_communication, "Brief internal teams with approved key points.");
    const stakeholderManagement = toStringArray(raw?.stakeholder_management, ["Brief key partners", "Open direct escalation line"]);
    const monitoringPlan = toStringOrFallback(raw?.monitoring_plan, "Monitor media, social velocity, and sentiment hourly.");
    const recoveryTimeline = toStringOrFallback(raw?.recovery_timeline, "Stabilization target within 48 hours.");

    return {
        title: commonTitle,
        severity_assessment: severity,
        executive_summary: commonSummary,
        immediate_actions: immediateActions,
        holding_statement: holdingStatement,
        internal_communication: internalCommunication,
        stakeholder_management: stakeholderManagement,
        monitoring_plan: monitoringPlan,
        recovery_timeline: recoveryTimeline,
        outputs: [
            ["Primary action", commonTitle],
            ["Severity", severity],
            ["Holding statement", holdingStatement],
            ["Recovery timeline", recoveryTimeline],
        ],
        plan: toPlanSteps(immediateActions, stakeholderManagement),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a rich context string from an alert or narrative cluster.
 */
async function buildContext({ alertId, clusterId, workspaceId }) {
    const lines = [];

    if (alertId) {
        const alert = await prisma.alert.findFirst({ where: { id: alertId, workspaceId } });
        if (alert) {
            lines.push(`ALERT: [${(alert.severity || "medium").toUpperCase()}] ${alert.title}`);
            if (alert.whatHappened) lines.push(`What Happened: ${alert.whatHappened}`);
            if (alert.whyItMatters) lines.push(`Why It Matters: ${alert.whyItMatters}`);
        }
    }

    if (clusterId) {
        const cluster = await prisma.narrativeCluster.findFirst({
            where: { id: clusterId, workspaceId },
            include: {
                narrativeClusterSignals: {
                    take: 5,
                    include: { signal: { select: { title: true, content: true, sentiment: true, platform: true } } }
                }
            }
        });
        if (cluster) {
            lines.push(`NARRATIVE: ${cluster.title}`);
            if (cluster.description) lines.push(`Description: ${cluster.description}`);
            if (cluster.sentiment) lines.push(`Dominant Sentiment: ${cluster.sentiment}`);
            lines.push(`Signal Count: ${cluster.signalCount}`);
            lines.push("");
            lines.push("SAMPLE SIGNALS:");
            cluster.narrativeClusterSignals.forEach(ncs => {
                lines.push(`- [${ncs.signal.sentiment || "unknown"}] ${ncs.signal.title || "Untitled"}: ${ncs.signal.content.substring(0, 120)}...`);
            });
        }
    }

    // Also pull latest signals from the workspace for broader context
    if (workspaceId && lines.length < 5) {
        const recentSignals = await prisma.signal.findMany({
            where: { workspaceId },
            orderBy: { capturedAt: "desc" },
            take: 5,
            select: { title: true, content: true, sentiment: true, platform: true }
        });
        lines.push("");
        lines.push("RECENT SIGNALS:");
        recentSignals.forEach(s => {
            lines.push(`- [${s.sentiment || "unknown"}] [${s.platform || "unknown"}] ${s.title || "Untitled"}: ${s.content.substring(0, 120)}...`);
        });
    }

    return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates an AI-powered action plan with three strategic options.
 *
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.strategyType - One of: pr_response, content_strategy, influencer_strategy, crisis_response
 * @param {string} [params.alertId]
 * @param {string} [params.clusterId]
 * @returns {Promise<object>} - The saved ActionPlan with generated strategies.
 */
export async function generateActionPlan({ workspaceId, strategyType, alertId, clusterId }) {
    if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not configured.");
    }

    const promptConfig = STRATEGY_PROMPTS[strategyType];
    if (!promptConfig) {
        throw new Error(`Unknown strategy type: ${strategyType}. Must be one of: ${Object.keys(STRATEGY_PROMPTS).join(", ")}`);
    }

    console.log(`[ACTION] Generating ${strategyType} plan for workspace ${workspaceId}`);

    const scopedAlertId = alertId || null;
    if (scopedAlertId) {
        const alert = await prisma.alert.findFirst({
            where: { id: scopedAlertId, workspaceId },
            select: { id: true }
        });
        if (!alert) throw new Error("Alert not found");
    }

    const scopedClusterId = clusterId || null;
    if (scopedClusterId) {
        const cluster = await prisma.narrativeCluster.findFirst({
            where: { id: scopedClusterId, workspaceId },
            select: { id: true }
        });
        if (!cluster) throw new Error("Narrative cluster not found");
    }

    // 1. Build context
    const context = await buildContext({ alertId: scopedAlertId, clusterId: scopedClusterId, workspaceId });

    // 2. Generate 3 strategic options in parallel
    const options = await Promise.all([
        generateOption(strategyType, promptConfig, context, "Option A (Conservative/Safe)"),
        generateOption(strategyType, promptConfig, context, "Option B (Balanced/Recommended)"),
        generateOption(strategyType, promptConfig, context, "Option C (Bold/Aggressive)")
    ]);

    // 3. Save to database
    const actionPlan = await prisma.actionPlan.create({
        data: {
            workspaceId,
            alertId: scopedAlertId,
            clusterId: scopedClusterId,
            title: `${formatStrategyName(strategyType)} Action Plan`,
            option1: JSON.stringify(options[0]),
            option2: JSON.stringify(options[1]),
            option3: JSON.stringify(options[2])
        }
    });

    console.log(`[ACTION] Action plan saved: ${actionPlan.id}`);

    return {
        id: actionPlan.id,
        title: actionPlan.title,
        strategyType,
        createdAt: actionPlan.createdAt,
        options: {
            conservative: options[0],
            balanced: options[1],
            bold: options[2]
        }
    };
}

/**
 * Generates a single strategic option via OpenAI.
 */
async function generateOption(strategyType, promptConfig, context, toneSuffix) {
    try {
        const messages = [
            { role: "system", content: promptConfig.system },
            { role: "user", content: `${promptConfig.user(context)}\n\nGenerate this as: ${toneSuffix}` }
        ];
        const response = await callOpenAIWithRetry(messages, { toneSuffix });

        const raw = response.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(raw);
        return normalizeStrategyOutput(strategyType, parsed, toneSuffix);
    } catch (error) {
        logStructured("error", "generate_option_failed", {
            toneSuffix,
            timeoutMs: OPENAI_TIMEOUT_MS,
            retries: OPENAI_MAX_RETRIES,
            aborted: isAbortError(error),
            error: error?.message || "Unknown error",
        });
        return normalizeStrategyOutput(
            strategyType,
            {
                title: `${formatStrategyName(promptConfig.type)} (${toneSuffix})`,
                executive_summary: `Generation fallback used due to provider failure: ${error.message}`,
            },
            toneSuffix
        );
    }
}

/**
 * Formats strategy type into a human-readable name.
 */
function formatStrategyName(type) {
    const names = {
        pr_response: "PR Response",
        content_strategy: "Content Strategy",
        influencer_strategy: "Influencer Strategy",
        crisis_response: "Crisis Response"
    };
    return names[type] || type;
}
