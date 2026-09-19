/**
 * Webhook Dispatcher Service
 * Dispatches crisis alerts and notification payloads to active workspace integrations
 * (Slack, Microsoft Teams, generic webhooks)
 */

import supabase from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";
import { sendSlackMessage, formatAlertForSlack } from "../../lib/notifications/slack.js";
import { sendTeamsMessage, formatAlertForTeams } from "../../lib/notifications/teams.js";

/**
 * Extract webhook URL from integration config
 */
function getWebhookUrl(integration) {
    const config = integration?.config || {};
    return config.webhookUrl || config.url || config.webhook_url || config.incomingWebhook?.url || null;
}

/**
 * Dispatch an alert to all active webhooks in the alert's workspace
 * @param {object} alert - The alert database record
 * @returns {Promise<{dispatched: number, total: number, results: Array}>}
 */
export async function dispatchAlertToWebhooks(alert) {
    if (!alert?.workspace_id) {
        return { dispatched: 0, total: 0, results: [] };
    }

    try {
        const { data: integrations, error } = await supabase
            .from("integrations")
            .select("*")
            .eq("workspace_id", alert.workspace_id)
            .eq("status", "active")
            .in("platform", ["slack", "teams", "webhook"]);

        if (error) {
            logStructured("error", "Failed to fetch integrations for alert dispatch", {
                workspaceId: alert.workspace_id,
                error: error.message,
            });
            return { dispatched: 0, total: 0, results: [] };
        }

        if (!integrations || integrations.length === 0) {
            return { dispatched: 0, total: 0, results: [] };
        }

        const results = [];
        let dispatchedCount = 0;

        for (const integration of integrations) {
            const url = getWebhookUrl(integration);
            if (!url) {
                results.push({
                    integrationId: integration.id,
                    platform: integration.platform,
                    status: "skipped",
                    reason: "Missing webhook URL in config",
                });
                continue;
            }

            try {
                if (integration.platform === "slack") {
                    const message = formatAlertForSlack(alert);
                    await sendSlackMessage(url, message);
                } else if (integration.platform === "teams") {
                    const message = formatAlertForTeams(alert);
                    await sendTeamsMessage(url, message);
                } else if (integration.platform === "webhook") {
                    const response = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            event: "alert.created",
                            timestamp: new Date().toISOString(),
                            alert,
                        }),
                    });
                    if (!response.ok) {
                        throw new Error(`Generic webhook returned status ${response.status}`);
                    }
                }

                dispatchedCount++;
                results.push({
                    integrationId: integration.id,
                    platform: integration.platform,
                    status: "delivered",
                });

                // Update last_sync_at
                await supabase
                    .from("integrations")
                    .update({ last_sync_at: new Date().toISOString() })
                    .eq("id", integration.id);

            } catch (dispatchErr) {
                logStructured("warn", "Webhook dispatch failed for integration", {
                    integrationId: integration.id,
                    platform: integration.platform,
                    error: dispatchErr.message,
                });
                results.push({
                    integrationId: integration.id,
                    platform: integration.platform,
                    status: "failed",
                    error: dispatchErr.message,
                });
            }
        }

        logStructured("info", "Alert dispatched to integrations", {
            alertId: alert.id,
            workspaceId: alert.workspace_id,
            dispatched: dispatchedCount,
            total: integrations.length,
        });

        return { dispatched: dispatchedCount, total: integrations.length, results };
    } catch (err) {
        logStructured("error", "Unexpected error in dispatchAlertToWebhooks", {
            error: err.message,
            alertId: alert?.id,
        });
        return { dispatched: 0, total: 0, results: [], error: err.message };
    }
}

/**
 * Send a verification test message through an integration
 * @param {object} integration - The integration record
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function testIntegrationConnection(integration) {
    const url = getWebhookUrl(integration);
    if (!url) {
        throw new Error("No webhook URL configured for this integration. Please provide a valid URL.");
    }

    if (integration.platform === "slack") {
        const testPayload = {
            text: "🔔 [Narriv Test] Webhook connection successful!",
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "✅ Narriv Webhook Connection Verified",
                        emoji: true,
                    },
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*Status:* Connected\n*Channel:* Verified\n*Timestamp:* ${new Date().toISOString()}\n\nThis channel will receive real-time crisis alerts and narrative intelligence from your Narriv workspace.`,
                    },
                },
            ],
        };
        await sendSlackMessage(url, testPayload);
        return { success: true, message: "Slack test notification sent successfully" };
    }

    if (integration.platform === "teams") {
        const testPayload = {
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
                                style: "good",
                                items: [
                                    {
                                        type: "TextBlock",
                                        text: "✅ Narriv Webhook Connection Verified",
                                        weight: "Bolder",
                                        size: "Medium",
                                    },
                                ],
                            },
                            {
                                type: "TextBlock",
                                text: `Your Microsoft Teams channel is connected to Narriv. Crisis and narrative alerts will be posted here automatically.\n\n*Verified at:* ${new Date().toISOString()}`,
                                wrap: true,
                            },
                        ],
                    },
                },
            ],
        };
        await sendTeamsMessage(url, testPayload);
        return { success: true, message: "Microsoft Teams test notification sent successfully" };
    }

    if (integration.platform === "webhook") {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                event: "integration.test",
                message: "Test ping from Narriv Intelligence Platform",
                timestamp: new Date().toISOString(),
                integrationId: integration.id,
            }),
        });

        if (!response.ok) {
            throw new Error(`Webhook endpoint responded with HTTP status ${response.status}`);
        }
        return { success: true, message: `Webhook responded with HTTP ${response.status}` };
    }

    return { success: true, message: `Integration ${integration.platform} verified` };
}
