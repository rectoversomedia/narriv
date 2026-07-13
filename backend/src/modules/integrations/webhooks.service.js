/**
 * Webhook module for Narriv
 * Handles webhook creation, management, and event dispatching
 */

import crypto from "crypto";
import supabase from "../../lib/supabase.js";
import { addNotificationJob } from "../../lib/queue.js";
import { logStructured } from "../../lib/logger.js";

// Supported webhook events
export const WEBHOOK_EVENTS = [
    "signal.created",
    "signal.analyzed",
    "alert.created",
    "alert.status_changed",
    "alert.escalated",
    "action_plan.created",
    "action_plan.completed",
    "report.generated",
    "report.exported",
    "workspace.member_added",
    "workspace.member_removed",
];

// Event descriptions for documentation
export const WEBHOOK_EVENT_DESCRIPTIONS = {
    "signal.created": "Triggered when a new signal is ingested",
    "signal.analyzed": "Triggered when AI analysis completes for a signal",
    "alert.created": "Triggered when a new alert is generated",
    "alert.status_changed": "Triggered when an alert status changes",
    "alert.escalated": "Triggered when an alert is escalated",
    "action_plan.created": "Triggered when a new action plan is generated",
    "action_plan.completed": "Triggered when an action plan is marked complete",
    "report.generated": "Triggered when a scheduled report is generated",
    "report.exported": "Triggered when a report export completes",
    "workspace.member_added": "Triggered when a new member joins the workspace",
    "workspace.member_removed": "Triggered when a member is removed from workspace",
};

/**
 * Generate a secure webhook secret
 */
export function generateWebhookSecret() {
    return crypto.randomBytes(32).toString("hex");
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(payload, signature, secret) {
    const expected = crypto
        .createHmac("sha256", secret)
        .update(payload, "utf8")
        .digest("hex");

    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature, "hex"),
            Buffer.from(expected, "hex")
        );
    } catch {
        return false;
    }
}

/**
 * Create webhook delivery record
 */
async function createDeliveryRecord(webhookId, payload, response, success) {
    try {
        await supabase.from("webhook_deliveries").insert({
            webhook_id: webhookId,
            event: payload.event,
            payload: payload,
            response_status: response.status || 0,
            response_body: typeof response.body === "string"
                ? response.body.substring(0, 1000)
                : JSON.stringify(response.body).substring(0, 1000),
            success: success,
            delivered_at: new Date().toISOString(),
        });
    } catch (error) {
        logStructured("error", "Failed to create webhook delivery record", { error: error.message });
    }
}

/**
 * Dispatch webhook event to all matching webhooks
 */
export async function dispatchWebhookEvent(workspaceId, event, data) {
    try {
        // Find all webhooks subscribed to this event
        const { data: webhooks, error } = await supabase
            .from("webhooks")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("is_active", true)
            .contains("events", [event]);

        if (error) {
            logStructured("error", "Failed to fetch webhooks for dispatch", { error: error.message });
            return;
        }

        if (!webhooks || webhooks.length === 0) {
            logStructured("debug", "No webhooks subscribed to event", { workspaceId, event });
            return;
        }

        const payload = {
            id: `evt_${crypto.randomBytes(12).toString("hex")}`,
            event: event,
            timestamp: new Date().toISOString(),
            workspaceId: workspaceId,
            data: data,
        };

        // Dispatch to all matching webhooks in parallel
        const deliveries = webhooks.map(webhook =>
            deliverWebhook(webhook, payload).catch(err => {
                logStructured("error", "Webhook delivery failed", {
                    webhookId: webhook.id,
                    error: err.message
                });
            })
        );

        await Promise.allSettled(deliveries);

        logStructured("info", "Webhook event dispatched", {
            workspaceId,
            event,
            webhookCount: webhooks.length
        });
    } catch (error) {
        logStructured("error", "Failed to dispatch webhook event", {
            workspaceId,
            event,
            error: error.message
        });
    }
}

/**
 * Deliver webhook payload to endpoint
 */
async function deliverWebhook(webhook, payload) {
    const startTime = Date.now();
    let response = { status: 0, body: "" };
    let success = false;

    try {
        const body = JSON.stringify(payload);

        // Generate signature
        const signature = crypto
            .createHmac("sha256", webhook.secret)
            .update(body, "utf8")
            .digest("hex");

        const fetchResponse = await fetch(webhook.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Narriv-Signature": signature,
                "X-Narriv-Event": payload.event,
                "X-Narriv-Delivery": payload.id,
                "User-Agent": "Narriv-Webhook/1.0",
            },
            body: body,
            signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        response.status = fetchResponse.status;
        response.body = await fetchResponse.text();
        success = fetchResponse.ok;

        // Record delivery
        await createDeliveryRecord(webhook.id, payload, response, success);

        logStructured("info", "Webhook delivered", {
            webhookId: webhook.id,
            event: payload.event,
            status: response.status,
            durationMs: Date.now() - startTime,
            success: success,
        });

        // Update webhook stats
        await supabase
            .from("webhooks")
            .update({
                last_triggered_at: new Date().toISOString(),
                success_count: webhook.success_count + (success ? 1 : 0),
                failure_count: webhook.failure_count + (success ? 0 : 1),
                last_error: success ? null : response.body.substring(0, 500),
            })
            .eq("id", webhook.id);

        return { success, status: response.status };
    } catch (error) {
        response.body = error.message;
        success = false;

        await createDeliveryRecord(webhook.id, payload, response, false);

        // Update webhook with failure
        await supabase
            .from("webhooks")
            .update({
                last_triggered_at: new Date().toISOString(),
                failure_count: webhook.failure_count + 1,
                last_error: error.message.substring(0, 500),
            })
            .eq("id", webhook.id);

        logStructured("error", "Webhook delivery error", {
            webhookId: webhook.id,
            event: payload.event,
            error: error.message,
            durationMs: Date.now() - startTime,
        });

        throw error;
    }
}

/**
 * Retry failed webhook deliveries
 */
export async function retryFailedDeliveries(webhookId) {
    try {
        const { data: deliveries, error } = await supabase
            .from("webhook_deliveries")
            .select("*")
            .eq("webhook_id", webhookId)
            .eq("success", false)
            .order("delivered_at", { ascending: false })
            .limit(10);

        if (error) throw error;
        if (!deliveries || deliveries.length === 0) return { retried: 0 };

        const { data: webhook, error: webhookError } = await supabase
            .from("webhooks")
            .select("*")
            .eq("id", webhookId)
            .single();

        if (webhookError || !webhook) throw new Error("Webhook not found");

        let retried = 0;
        for (const delivery of deliveries) {
            try {
                await deliverWebhook(webhook, delivery.payload);
                retried++;
            } catch (error) {
                logStructured("error", "Retry delivery failed", {
                    webhookId,
                    deliveryId: delivery.id,
                    error: error.message
                });
            }
        }

        return { retried };
    } catch (error) {
        logStructured("error", "Failed to retry deliveries", {
            webhookId,
            error: error.message
        });
        return { retried: 0, error: error.message };
    }
}

/**
 * List webhooks for a workspace
 */
export async function listWebhooks(workspaceId) {
    const { data, error } = await supabase
        .from("webhooks")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get webhook by ID
 */
export async function getWebhook(webhookId, workspaceId) {
    const { data, error } = await supabase
        .from("webhooks")
        .select("*")
        .eq("id", webhookId)
        .eq("workspace_id", workspaceId)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            return null;
        }
        throw error;
    }
    return data;
}

/**
 * Create new webhook
 */
export async function createWebhook(workspaceId, url, events, description) {
    const secret = generateWebhookSecret();

    const { data, error } = await supabase
        .from("webhooks")
        .insert({
            workspace_id: workspaceId,
            url: url,
            events: events,
            secret: secret,
            description: description || null,
            is_active: true,
        })
        .select()
        .single();

    if (error) throw error;

    // Return without the secret in subsequent queries
    return {
        ...data,
        secret: secret, // Only return secret on creation
    };
}

/**
 * Update webhook
 */
export async function updateWebhook(webhookId, workspaceId, updates) {
    const allowedUpdates = ["url", "events", "description", "is_active"];
    const filteredUpdates = Object.keys(updates)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj, key) => {
            obj[key] = updates[key];
            return obj;
        }, {});

    if (Object.keys(filteredUpdates).length === 0) {
        return getWebhook(webhookId, workspaceId);
    }

    const { data, error } = await supabase
        .from("webhooks")
        .update(filteredUpdates)
        .eq("id", webhookId)
        .eq("workspace_id", workspaceId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete webhook
 */
export async function deleteWebhook(webhookId, workspaceId) {
    const { error } = await supabase
        .from("webhooks")
        .delete()
        .eq("id", webhookId)
        .eq("workspace_id", workspaceId);

    if (error) throw error;
    return { success: true };
}

/**
 * Rotate webhook secret
 */
export async function rotateWebhookSecret(webhookId, workspaceId) {
    const newSecret = generateWebhookSecret();

    const { data, error } = await supabase
        .from("webhooks")
        .update({ secret: newSecret })
        .eq("id", webhookId)
        .eq("workspace_id", workspaceId)
        .select()
        .single();

    if (error) throw error;

    return {
        ...data,
        secret: newSecret,
    };
}

/**
 * Test webhook by sending a test event
 */
export async function testWebhook(webhookId, workspaceId) {
    const webhook = await getWebhook(webhookId, workspaceId);
    if (!webhook) {
        throw new Error("Webhook not found");
    }

    const testPayload = {
        id: `evt_test_${crypto.randomBytes(8).toString("hex")}`,
        event: "test",
        timestamp: new Date().toISOString(),
        workspaceId: workspaceId,
        data: {
            message: "This is a test webhook delivery",
            webhook_id: webhookId,
        },
    };

    try {
        const result = await deliverWebhook(webhook, testPayload);
        return result;
    } catch (error) {
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Get webhook delivery history
 */
export async function getWebhookDeliveries(webhookId, workspaceId, limit = 50) {
    // Verify ownership
    const webhook = await getWebhook(webhookId, workspaceId);
    if (!webhook) {
        throw new Error("Webhook not found");
    }

    const { data, error } = await supabase
        .from("webhook_deliveries")
        .select("*")
        .eq("webhook_id", webhookId)
        .order("delivered_at", { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

/**
 * Get webhook statistics
 */
export async function getWebhookStats(webhookId, workspaceId) {
    const webhook = await getWebhook(webhookId, workspaceId);
    if (!webhook) {
        throw new Error("Webhook not found");
    }

    // Get delivery stats
    const { data: recentDeliveries, error } = await supabase
        .from("webhook_deliveries")
        .select("success, delivered_at")
        .eq("webhook_id", webhookId)
        .order("delivered_at", { ascending: false })
        .limit(100);

    if (error) throw error;

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
        total_deliveries: webhook.success_count + webhook.failure_count,
        successful_deliveries: webhook.success_count,
        failed_deliveries: webhook.failure_count,
        success_rate: webhook.success_count + webhook.failure_count > 0
            ? Math.round((webhook.success_count / (webhook.success_count + webhook.failure_count)) * 100)
            : 100,
        last_triggered_at: webhook.last_triggered_at,
        last_24h: {
            total: 0,
            successful: 0,
            failed: 0,
        },
        last_7d: {
            total: 0,
            successful: 0,
            failed: 0,
        },
    };

    if (recentDeliveries) {
        for (const delivery of recentDeliveries) {
            const deliveredAt = new Date(delivery.delivered_at);
            if (deliveredAt >= last24h) {
                stats.last_24h.total++;
                if (delivery.success) stats.last_24h.successful++;
                else stats.last_24h.failed++;
            }
            if (deliveredAt >= last7d) {
                stats.last_7d.total++;
                if (delivery.success) stats.last_7d.successful++;
                else stats.last_7d.failed++;
            }
        }
    }

    return stats;
}
