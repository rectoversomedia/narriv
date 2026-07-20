import supabase from "./supabase.js";
import redisConnection from "./redis.js";
import OpenAI from "openai";
import { ApifyClient } from "apify-client";

function ok(service, details = {}) {
    return { service, status: "ok", ...details };
}

function fail(service, error, details = {}) {
    return { service, status: "error", error: String(error?.message || error), ...details };
}

export async function checkDatabaseHealth() {
    try {
        // Check if Supabase is properly configured
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_KEY;
        if (!url || !key || key === "REPLACE_WITH_YOUR_SERVICE_ROLE_KEY" || url.includes("your-project")) {
            return { service: "database", status: "unavailable", reason: "Supabase credentials not configured" };
        }

        // Supabase equivalent: select 1 row to verify connection
        const { error } = await supabase.from('users').select('id').limit(1);
        if (error) {
            // Invalid API key means credentials are wrong
            if (String(error?.message || "").includes("Invalid API key")) {
                return { service: "database", status: "unavailable", reason: "Invalid Supabase API key - check credentials" };
            }
            throw error;
        }
        return ok("database");
    } catch (error) {
        return fail("database", error);
    }
}

export async function checkQueueHealth() {
    try {
        const pong = await redisConnection.ping();
        return ok("queue", { response: pong });
    } catch (error) {
        return fail("queue", error);
    }
}

export async function checkOpenAIHealth() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
        return { service: "openai", status: "unavailable", reason: "OPENAI_API_KEY is missing" };
    }

    // Skip check for placeholder/disabled keys
    if (key.startsWith("sk-placeholder") || key.startsWith("sk-disab") || key.includes("placeholder")) {
        return { service: "openai", status: "unavailable", reason: "OPENAI_API_KEY is a placeholder - AI features disabled" };
    }

    try {
        const client = new OpenAI({ apiKey: key });
        await client.models.list({ limit: 1 });
        return ok("openai");
    } catch (error) {
        return fail("openai", error);
    }
}

export async function checkIngestionProviderHealth() {
    const token = process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN;
    if (!token) {
        return { service: "ingestion_provider", provider: "apify", status: "unavailable", reason: "APIFY_TOKEN is missing" };
    }

    // Skip check for placeholder tokens
    if (token.includes("REPLACE") || token.includes("placeholder")) {
        return { service: "ingestion_provider", provider: "apify", status: "unavailable", reason: "APIFY_TOKEN is a placeholder - ingestion disabled" };
    }

    try {
        // Pre-require proxy-agent so apify-client's dynamic import works on Vercel
        try {
            require("proxy-agent");
        } catch {}

        const client = new ApifyClient({ token });
        const me = await client.user().get();
        return ok("ingestion_provider", { provider: "apify", accountId: me?.id || null });
    } catch (error) {
        // If proxy-agent is missing, return unavailable instead of error
        if (String(error?.message || "").includes("proxy-agent")) {
            return { service: "ingestion_provider", provider: "apify", status: "unavailable", reason: "Apify proxy-agent dependency missing - ingestion disabled" };
        }
        return fail("ingestion_provider", error, { provider: "apify" });
    }
}

export async function getRuntimeHealth() {
    const checks = await Promise.all([
        checkDatabaseHealth(),
        checkQueueHealth(),
        checkOpenAIHealth(),
        checkIngestionProviderHealth(),
    ]);

    const hasError = checks.some((c) => c.status === "error");
    return {
        status: hasError ? "degraded" : "ok",
        timestamp: new Date().toISOString(),
        services: checks,
    };
}
