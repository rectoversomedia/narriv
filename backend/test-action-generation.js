import assert from "node:assert/strict";
import { normalizeStrategyOutput } from "./src/modules/actions/actions.service.js";

function assertValidOutputShape(result, label) {
    assert.ok(result && typeof result === "object", `${label}: result must be object`);
    assert.ok(Array.isArray(result.outputs), `${label}: outputs must be an array`);
    assert.ok(Array.isArray(result.plan), `${label}: plan must be an array`);

    result.outputs.forEach((pair, idx) => {
        assert.ok(Array.isArray(pair), `${label}: outputs[${idx}] must be tuple array`);
        assert.equal(pair.length, 2, `${label}: outputs[${idx}] must have 2 items`);
        assert.equal(typeof pair[0], "string", `${label}: outputs[${idx}][0] must be string`);
        assert.equal(typeof pair[1], "string", `${label}: outputs[${idx}][1] must be string`);
    });

    result.plan.forEach((pair, idx) => {
        assert.ok(Array.isArray(pair), `${label}: plan[${idx}] must be tuple array`);
        assert.equal(pair.length, 2, `${label}: plan[${idx}] must have 2 items`);
        assert.equal(typeof pair[0], "string", `${label}: plan[${idx}][0] must be string`);
        assert.equal(typeof pair[1], "string", `${label}: plan[${idx}][1] must be string`);
    });
}

function runStrategyHappyPathTests() {
    const cases = [
        {
            strategy: "pr_response",
            payload: {
                title: "PR Containment Plan",
                executive_summary: "Short summary.",
                key_messages: ["Message A", "Message B"],
                talking_points: ["Point A", "Point B"],
                media_channels: ["Press Release", "X/Twitter"],
                timeline: "Within 24h",
                risk_considerations: "Escalation risk",
            },
        },
        {
            strategy: "content_strategy",
            payload: {
                title: "Content Narrative Plan",
                executive_summary: "Summary.",
                content_pillars: ["Pillar A", "Pillar B"],
                recommended_formats: ["Carousel", "Blog"],
                distribution_channels: ["Website", "Instagram"],
                key_themes: ["Trust", "Clarity"],
                publishing_cadence: "Daily",
                success_metrics: ["CTR", "Engagement"],
            },
        },
        {
            strategy: "influencer_strategy",
            payload: {
                title: "Influencer Push",
                executive_summary: "Summary.",
                target_influencer_profile: "Tech educator",
                engagement_approach: "Direct outreach",
                collaboration_formats: ["Live session", "Story"],
                key_messages_for_influencers: ["Accuracy first", "Avoid speculation"],
                platforms: ["TikTok", "YouTube"],
                budget_consideration: "Mid-tier focus",
                success_metrics: ["View-through", "Positive mentions"],
            },
        },
        {
            strategy: "crisis_response",
            payload: {
                title: "Crisis Response Plan",
                severity_assessment: "critical",
                executive_summary: "Summary.",
                immediate_actions: ["Open war room", "Issue statement"],
                holding_statement: "We are actively handling this issue.",
                internal_communication: "Internal memo now",
                stakeholder_management: ["Inform regulators", "Brief partners"],
                monitoring_plan: "Monitor hourly",
                recovery_timeline: "72 hours",
            },
        },
    ];

    cases.forEach((item) => {
        const result = normalizeStrategyOutput(item.strategy, item.payload, "Happy Path");
        assertValidOutputShape(result, `${item.strategy} happy path`);
    });
}

function runFailureScenarioTests() {
    const malformedCases = [
        { strategy: "pr_response", payload: { key_messages: "not-array", talking_points: [null, 42] } },
        { strategy: "content_strategy", payload: { content_pillars: null, success_metrics: "bad" } },
        { strategy: "influencer_strategy", payload: { collaboration_formats: {}, platforms: 12 } },
        { strategy: "crisis_response", payload: { immediate_actions: "bad", stakeholder_management: null } },
    ];

    malformedCases.forEach((item) => {
        const result = normalizeStrategyOutput(item.strategy, item.payload, "Malformed Input");
        assertValidOutputShape(result, `${item.strategy} malformed fallback`);
        assert.ok(result.outputs.length > 0, `${item.strategy}: outputs should not be empty`);
        assert.ok(result.plan.length > 0, `${item.strategy}: plan should not be empty`);
    });
}

function main() {
    runStrategyHappyPathTests();
    runFailureScenarioTests();
    console.log("All AI action generation normalization tests passed.");
}

main();

