/**
 * Slack Integration Service for Narriv
 * Handles Slack webhook notifications and OAuth
 */

import crypto from "crypto";
import { logStructured } from "../../lib/logger.js";

const SLACK_OAUTH_URL = "https://slack.com/oauth/v2/authorize";
const SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access";
const SLACK_API_URL = "https://slack.com/api";

/**
 * Generate Slack OAuth authorization URL
 */
export function getSlackAuthUrl(clientId, redirectUri, state) {
    const params = new URLSearchParams({
        client_id: clientId,
        scope: "incoming-webhook,chat:write,chat:write.public",
        redirect_uri: redirectUri,
        state: state,
    });
    return `${SLACK_OAUTH_URL}?${params.toString()}`;
}

/**
 * Exchange Slack authorization code for access token
 */
export async function exchangeSlackCode(clientId, clientSecret, code, redirectUri) {
    try {
        const response = await fetch(SLACK_TOKEN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                redirect_uri: redirectUri,
            }),
        });

        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.error || "Slack OAuth failed");
        }

        return {
            accessToken: data.access_token,
            teamId: data.team?.id,
            teamName: data.team?.name,
            incomingWebhook: data.incoming_webhook,
        };
    } catch (error) {
        logStructured("error", "Slack OAuth exchange failed", { error: error.message });
        throw error;
    }
}

/**
 * Send notification to Slack webhook
 */
export async function sendSlackMessage(webhookUrl, message) {
    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
        });

        if (!response.ok) {
            throw new Error(`Slack API error: ${response.status}`);
        }

        return { success: true };
    } catch (error) {
        logStructured("error", "Failed to send Slack message", { error: error.message });
        throw error;
    }
}

/**
 * Format alert as Slack Block Kit message
 */
export function formatAlertForSlack(alert) {
    const severityColors = {
        critical: "#FF0000",
        high: "#FF6B00",
        medium: "#FFB800",
        low: "#36A64F",
    };

    const statusEmojis = {
        new: ":bell:",
        investigating: ":mag:",
        escalated: ":warning:",
        resolved: ":white_check_mark:",
    };

    return {
        text: `${statusEmojis[alert.status] || ":bell:"} Alert: ${alert.title}`,
        blocks: [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: `${alert.severity?.toUpperCase() || "ALERT"} Alert`,
                    emoji: true,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*${alert.title}*\n\n${alert.description || ""}`,
                },
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `*Type:* ${alert.type} | *Status:* ${alert.status} | *Severity:* ${alert.severity}`,
                    },
                ],
            },
            ...(alert.assigned_to
                ? [
                    {
                        type: "context",
                        elements: [
                            {
                                type: "mrkdwn",
                                text: `*Assigned to:* ${alert.assigned_to}`,
                            },
                        ],
                    },
                ]
                : []),
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "View in Narriv",
                            emoji: true,
                        },
                        url: `${process.env.APP_URL || "https://app.narriv.ai"}/alerts/${alert.id}`,
                        action_id: "view_alert",
                    },
                    ...(alert.status === "new"
                        ? [
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "Acknowledge",
                                    emoji: true,
                                },
                                action_id: "acknowledge_alert",
                            },
                        ]
                        : []),
                ],
            },
        ],
        attachments: [
            {
                color: severityColors[alert.severity] || severityColors.medium,
                footer: "Narriv Alert System",
                ts: alert.created_at ? Math.floor(new Date(alert.created_at).getTime() / 1000) : undefined,
            },
        ],
    };
}

/**
 * Format signal as Slack message
 */
export function formatSignalForSlack(signal) {
    const sentimentEmojis = {
        positive: ":smile:",
        negative: ":disappointed:",
        neutral: ":neutral_face:",
        mixed: ":confused:",
    };

    return {
        text: `${sentimentEmojis[signal.sentiment] || ":speech_balloon:"} New Signal`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*${signal.title}*`,
                },
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `*Platform:* ${signal.platform} | *Sentiment:* ${signal.sentiment} | *Score:* ${signal.sentiment_score || "N/A"}`,
                    },
                ],
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "View Signal",
                            emoji: true,
                        },
                        url: `${process.env.APP_URL || "https://app.narriv.ai"}/signals/${signal.id}`,
                    },
                ],
            },
        ],
    };
}

/**
 * Format action plan as Slack message
 */
export function formatActionPlanForSlack(actionPlan) {
    const priorityEmojis = {
        critical: ":rotating_light:",
        high: ":exclamation:",
        medium: ":warning:",
        low: ":information_source:",
    };

    return {
        text: `${priorityEmojis[actionPlan.priority] || ":white_check_mark:"} Action Plan: ${actionPlan.title}`,
        blocks: [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: `Action Plan: ${actionPlan.title}`,
                    emoji: true,
                },
            },
            ...(actionPlan.description
                ? [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: actionPlan.description,
                        },
                    },
                ]
                : []),
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `*Type:* ${actionPlan.type} | *Status:* ${actionPlan.status} | *Priority:* ${actionPlan.priority}`,
                    },
                ],
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "View Action Plan",
                            emoji: true,
                        },
                        url: `${process.env.APP_URL || "https://app.narriv.ai"}/action-plans/${actionPlan.id}`,
                    },
                ],
            },
        ],
    };
}

/**
 * Send notification to Slack channel
 */
export async function notifySlackChannel(accessToken, channel, message) {
    try {
        const response = await fetch(`${SLACK_API_URL}/chat.postMessage`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                channel: channel,
                ...message,
            }),
        });

        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.error || "Failed to send message");
        }

        return { success: true, ts: data.ts };
    } catch (error) {
        logStructured("error", "Failed to notify Slack channel", { error: error.message });
        throw error;
    }
}
