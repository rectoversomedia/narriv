import { logStructured } from "../../lib/logger.js";

/**
 * Handle an incoming webhook payload.
 *
 * @param {Object} params
 * @param {string} params.workspaceId
 * @param {string} params.sourceId
 * @param {Object} params.payload - Webhook payload
 * @returns {Promise<Array>} - Processed items
 */
export async function handleWebhook({ workspaceId, sourceId, payload }) {
    try {
        // Normalize webhook payload to standard items format
        const items = [];

        if (Array.isArray(payload)) {
            // Array of items
            for (const item of payload) {
                items.push(normalizeWebhookItem(item, sourceId));
            }
        } else if (payload && typeof payload === "object") {
            // Single item or wrapped in a key
            const data = payload.data || payload.items || payload.records || [payload];
            if (Array.isArray(data)) {
                for (const item of data) {
                    items.push(normalizeWebhookItem(item, sourceId));
                }
            }
        }

        logStructured("info", "webhook_processed", { workspaceId, sourceId, itemCount: items.length });
        return items;
    } catch (error) {
        logStructured("error", "webhook_processing_failed", { workspaceId, sourceId, error: error.message });
        return [];
    }
}

function normalizeWebhookItem(item, sourceId) {
    return {
        title: item.title || item.name || item.subject || "Webhook item",
        content: item.content || item.body || item.message || item.description || item.text || "",
        author: item.author || item.sender || item.from || "",
        publishedDate: item.publishedDate || item.timestamp || item.date || item.createdAt || new Date().toISOString(),
        url: item.url || item.link || item.permalink || "",
        externalId: item.id ? `webhook_${item.id}` : undefined,
    };
}
