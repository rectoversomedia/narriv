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
        // Supabase equivalent: select 1 row to verify connection
        const { error } = await supabase.from('users').select('id').limit(1);
        if (error) {
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

    try {
        const client = new ApifyClient({ token });
        const me = await client.user().get();
        return ok("ingestion_provider", { provider: "apify", accountId: me?.id || null });
    } catch (error) {
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
