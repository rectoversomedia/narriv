/**
 * Microsoft Teams Integration Service for Narriv
 * Handles Teams webhook notifications and adaptive cards
 */

import { logStructured } from "../../lib/logger.js";

const TEAMS_API_URL = "https://graph.microsoft.com/v1.0";
const TEAMS_WEBHOOK_URL = "https://outlook.office.com/webhook";

/**
 * Send notification to Teams webhook
 */
export async function sendTeamsMessage(webhookUrl, message) {
    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
        });

        if (!response.ok) {
            throw new Error(`Teams webhook error: ${response.status}`);
        }

        return { success: true };
    } catch (error) {
        logStructured("error", "Failed to send Teams message", { error: error.message });
        throw error;
    }
}

/**
 * Format alert as Teams Adaptive Card
 */
export function formatAlertForTeams(alert) {
    const severityColors = {
        critical: "attention",
        high: "attention",
        medium: "warning",
        low: "accent",
    };

    const statusText = {
        new: "New",
        investigating: "Under Investigation",
        escalated: "Escalated",
        resolved: "Resolved",
    };

    return {
        type: "message",
        attachments: [
            {
                contentType: "application/vnd.microsoft.card.adaptive",
                content: {
                    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                    type: "AdaptiveCard",
                    version: "1.4",
                    body: [
                        {
                            type: "Container",
                            style: severityColors[alert.severity] || "warning",
                            items: [
                                {
                                    type: "TextBlock",
                                    text: `${alert.severity?.toUpperCase() || "ALERT"}: ${alert.title}`,
                                    weight: "Bolder",
                                    size: "Medium",
                                    wrap: true,
                                },
                            ],
                        },
                        {
                            type: "TextBlock",
                            text: alert.description || "No description provided.",
                            wrap: true,
                            spacing: "Medium",
                        },
                        {
                            type: "FactSet",
                            facts: [
                                {
                                    title: "Type",
                                    value: alert.type || "Unknown",
                                },
                                {
                                    title: "Severity",
                                    value: alert.severity || "Unknown",
                                },
                                {
                                    title: "Status",
                                    value: statusText[alert.status] || alert.status,
                                },
                                {
                                    title: "Source",
                                    value: alert.source || "Unknown",
                                },
                                ...(alert.assigned_to
                                    ? [{ title: "Assigned To", value: alert.assigned_to }]
                                    : []),
                            ],
                        },
                        ...(alert.what_to_do
                            ? [
                                {
                                    type: "TextBlock",
                                    text: `Recommended Action: ${alert.what_to_do}`,
                                    wrap: true,
                                    isSubtle: true,
                                },
                            ]
                            : []),
                    ],
                    actions: [
                        {
                            type: "Action.OpenUrl",
                            title: "View in Narriv",
                            url: `${process.env.APP_URL || "https://app.narriv.ai"}/alerts/${alert.id}`,
                        },
                        ...(alert.status === "new"
                            ? [
                                {
                                    type: "Action.ShowCard",
                                    title: "Acknowledge",
                                    card: {
                                        type: "AdaptiveCard",
                                        body: [
                                            {
                                                type: "TextBlock",
                                                text: "Acknowledge this alert?",
                                            },
                                        ],
                                        actions: [
                                            {
                                                type: "Action.Submit",
                                                title: "Acknowledge",
                                                data: {
                                                    action: "acknowledge",
                                                    alertId: alert.id,
                                                },
                                            },
                                        ],
                                    },
                                },
                            ]
                            : []),
                    ],
                },
            },
        ],
    };
}

/**
 * Format signal as Teams Adaptive Card
 */
export function formatSignalForTeams(signal) {
    const sentimentColors = {
        positive: "good",
        negative: "attention",
        neutral: "accent",
        mixed: "warning",
    };

    return {
        type: "message",
        attachments: [
            {
                contentType: "application/vnd.microsoft.card.adaptive",
                content: {
                    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                    type: "AdaptiveCard",
                    version: "1.4",
                    body: [
                        {
                            type: "Container",
                            style: sentimentColors[signal.sentiment] || "accent",
                            items: [
                                {
                                    type: "TextBlock",
                                    text: "New Signal Detected",
                                    weight: "Bolder",
                                    size: "Medium",
                                },
                            ],
                        },
                        {
                            type: "TextBlock",
                            text: signal.title,
                            weight: "Bolder",
                            wrap: true,
                            spacing: "Medium",
                        },
                        {
                            type: "TextBlock",
                            text: signal.content?.substring(0, 200) || "",
                            wrap: true,
                            isSubtle: true,
                        },
                        {
                            type: "FactSet",
                            facts: [
                                {
                                    title: "Platform",
                                    value: signal.platform || "Unknown",
                                },
                                {
                                    title: "Sentiment",
                                    value: signal.sentiment || "Unknown",
                                },
                                {
                                    title: "Score",
                                    value: signal.sentiment_score?.toString() || "N/A",
                                },
                                ...(signal.author ? [{ title: "Author", value: signal.author }] : []),
                            ],
                        },
                    ],
                    actions: [
                        {
                            type: "Action.OpenUrl",
                            title: "View Signal",
                            url: `${process.env.APP_URL || "https://app.narriv.ai"}/signals/${signal.id}`,
                        },
                    ],
                },
            },
        ],
    };
}

/**
 * Format action plan as Teams Adaptive Card
 */
export function formatActionPlanForTeams(actionPlan) {
    const priorityColors = {
        critical: "attention",
        high: "attention",
        medium: "warning",
        low: "accent",
    };

    return {
        type: "message",
        attachments: [
            {
                contentType: "application/vnd.microsoft.card.adaptive",
                content: {
                    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                    type: "AdaptiveCard",
                    version: "1.4",
                    body: [
                        {
                            type: "Container",
                            style: priorityColors[actionPlan.priority] || "accent",
                            items: [
                                {
                                    type: "TextBlock",
                                    text: `Action Plan: ${actionPlan.title}`,
                                    weight: "Bolder",
                                    size: "Medium",
                                    wrap: true,
                                },
                            ],
                        },
                        ...(actionPlan.description
                            ? [
                                {
                                    type: "TextBlock",
                                    text: actionPlan.description,
                                    wrap: true,
                                },
                            ]
                            : []),
                        {
                            type: "FactSet",
                            facts: [
                                {
                                    title: "Type",
                                    value: actionPlan.type || "Unknown",
                                },
                                {
                                    title: "Status",
                                    value: actionPlan.status || "Pending",
                                },
                                {
                                    title: "Priority",
                                    value: actionPlan.priority || "Medium",
                                },
                            ],
                        },
                    ],
                    actions: [
                        {
                            type: "Action.OpenUrl",
                            title: "View Action Plan",
                            url: `${process.env.APP_URL || "https://app.narriv.ai"}/action-plans/${actionPlan.id}`,
                        },
                    ],
                },
            },
        ],
    };
}

/**
 * Format report as Teams Adaptive Card
 */
export function formatReportForTeams(report) {
    return {
        type: "message",
        attachments: [
            {
                contentType: "application/vnd.microsoft.card.adaptive",
                content: {
                    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                    type: "AdaptiveCard",
                    version: "1.4",
                    body: [
                        {
                            type: "Container",
                            style: "accent",
                            items: [
                                {
                                    type: "TextBlock",
                                    text: "Report Ready",
                                    weight: "Bolder",
                                    size: "Medium",
                                },
                            ],
                        },
                        {
                            type: "TextBlock",
                            text: report.title,
                            weight: "Bolder",
                            wrap: true,
                            spacing: "Medium",
                        },
                        {
                            type: "FactSet",
                            facts: [
                                {
                                    title: "Type",
                                    value: report.type || "Custom",
                                },
                                {
                                    title: "Status",
                                    value: report.status || "Generated",
                                },
                            ],
                        },
                    ],
                    actions: [
                        {
                            type: "Action.OpenUrl",
                            title: "View Report",
                            url: `${process.env.APP_URL || "https://app.narriv.ai"}/reports/${report.id}`,
                        },
                        ...(report.downloadUrl
                            ? [
                                {
                                    type: "Action.OpenUrl",
                                    title: "Download",
                                    url: report.downloadUrl,
                                },
                            ]
                            : []),
                    ],
                },
            },
        ],
    };
}

/**
 * Send proactive message to Teams user
 */
export async function sendTeamsProactiveMessage(accessToken, conversationId, message) {
    try {
        const response = await fetch(`${TEAMS_API_URL}/me/chats/${conversationId}/messages`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || "Failed to send message");
        }

        return { success: true, messageId: data.id };
    } catch (error) {
        logStructured("error", "Failed to send Teams proactive message", {
            error: error.message,
        });
        throw error;
    }
}

/**
 * Get Teams channel info
 */
export async function getTeamsChannel(accessToken, teamId, channelId) {
    try {
        const response = await fetch(
            `${TEAMS_API_URL}/teams/${teamId}/channels/${channelId}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        return await response.json();
    } catch (error) {
        logStructured("error", "Failed to get Teams channel", { error: error.message });
        throw error;
    }
}
