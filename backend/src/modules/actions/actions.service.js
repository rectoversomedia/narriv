import OpenAI from "openai";
import prisma from "../../prisma.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const client = new OpenAI({
    apiKey: OPENAI_API_KEY || "sk-placeholder",
});

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
        generateOption(promptConfig, context, "Option A (Conservative/Safe)"),
        generateOption(promptConfig, context, "Option B (Balanced/Recommended)"),
        generateOption(promptConfig, context, "Option C (Bold/Aggressive)")
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
async function generateOption(promptConfig, context, toneSuffix) {
    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: promptConfig.system },
                { role: "user", content: `${promptConfig.user(context)}\n\nGenerate this as: ${toneSuffix}` }
            ],
            temperature: 0.7,
            max_tokens: 800,
            response_format: { type: "json_object" }
        });

        const raw = response.choices[0]?.message?.content || "{}";
        return JSON.parse(raw);
    } catch (error) {
        console.error(`[ACTION] Error generating option (${toneSuffix}):`, error.message);
        return { error: `Failed to generate: ${error.message}` };
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
