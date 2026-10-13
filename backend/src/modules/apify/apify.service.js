import { ApifyClient } from "apify-client";
import { logStructured } from "../../lib/logger.js";

const APIFY_TOKEN = process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN;
const isMockMode = !APIFY_TOKEN;

// PHASE 7: Production safety. If APIFY_TOKEN is missing, refuse to fabricate
// signals. Operators must configure real credentials, not silently inject
// synthetic data. Real Google News RSS / custom RSS / webhook paths remain
// the supported sources when no Apify token is present.

const client = APIFY_TOKEN ? new ApifyClient({ token: APIFY_TOKEN }) : null;

class ApifyConfigurationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ApifyConfigurationError";
        this.code = "APIFY_NOT_CONFIGURED";
        this.userMessage = "Apify integration is not configured. Set APIFY_TOKEN in the environment to use Apify sources. For real data without Apify, use Google News RSS (POST /api/ingestion/fetch) or custom RSS feeds.";
    }
}

export const isApifyConfigured = () => Boolean(APIFY_TOKEN);

/**
 * Runs an Apify actor and retrieves the dataset items.
 *
 * Phase 7 behavior: if APIFY_TOKEN is missing, this throws
 * ApifyConfigurationError instead of returning synthetic data.
 * Production paths that need real data without Apify should use
 * ingestRssSignals() (Google News RSS / custom RSS) or the webhook
 * ingestion path instead.
 *
 * Test fixtures are no longer generated at this layer. Tests that
 * previously depended on mock data should inject fixtures directly.
 */
// Cost and time bounds applied to every actor run. maxItems / maxTotalChargeUsd
// are enforced by Apify itself (pay-per-result / pay-per-event actors), so a
// run cannot bill beyond them; timeout stops the run on Apify's side.
export const APIFY_MAX_ITEMS = 100;
export const apifyRunOptions = (maxItems) => ({
    maxItems: Math.max(1, Math.min(Number(maxItems) || 50, APIFY_MAX_ITEMS)),
    maxTotalChargeUsd: Number(process.env.APIFY_MAX_CHARGE_USD || 0.5),
    timeout: Number(process.env.APIFY_RUN_TIMEOUT_SECS || 240),
    waitSecs: Number(process.env.APIFY_RUN_TIMEOUT_SECS || 240) + 30,
});

export const runActorAndFetchDataset = async (actorId, inputConfig = {}, maxItems = 50) => {
    if (isMockMode || !client) {
        logStructured("error", "apify_not_configured", { actorId, mode: "REFUSED" });
        throw new ApifyConfigurationError(
            `Apify actor "${actorId}" was requested but APIFY_TOKEN is not configured. Narriv does not return synthetic data.`
        );
    }

    logStructured("info", "apify_actor_running", { actorId, mode: "LIVE" });

    try {
        const options = apifyRunOptions(maxItems);
        const run = await client.actor(actorId).call(inputConfig, options);
        logStructured("info", "apify_run_completed", { datasetId: run.defaultDatasetId, status: run.status, maxItems: options.maxItems });
        const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: options.maxItems });
        logStructured("info", "apify_items_fetched", { itemCount: items.length });
        return items;
    } catch (error) {
        logStructured("error", "[APIFY SERVICE] Error in Live Mode", { error: error?.message || error, stack: error?.stack });
        throw new Error(`Apify live extraction failed: ${error.message}`);
    }
};

export { ApifyConfigurationError };
