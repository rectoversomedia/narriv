const metrics = {
    endpointLatency: {
        // key: "METHOD /path" -> { count, totalMs, maxMs, minMs }
        byEndpoint: {},
    },
    failures: {
        ai: 0,
        ingestion: 0,
        export: 0,
    }
};

function getOrCreateLatencyBucket(key) {
    if (!metrics.endpointLatency.byEndpoint[key]) {
        metrics.endpointLatency.byEndpoint[key] = {
            count: 0,
            totalMs: 0,
            maxMs: 0,
            minMs: Number.POSITIVE_INFINITY,
        };
    }
    return metrics.endpointLatency.byEndpoint[key];
}

export function recordEndpointLatency(method, path, latencyMs) {
    const key = `${method.toUpperCase()} ${path}`;
    const bucket = getOrCreateLatencyBucket(key);
    bucket.count += 1;
    bucket.totalMs += latencyMs;
    bucket.maxMs = Math.max(bucket.maxMs, latencyMs);
    bucket.minMs = Math.min(bucket.minMs, latencyMs);
}

export function incrementAIFailure() {
    metrics.failures.ai += 1;
}

export function incrementIngestionFailure() {
    metrics.failures.ingestion += 1;
}

export function incrementExportFailure() {
    metrics.failures.export += 1;
}

export function getMetricsSnapshot() {
    const latency = {};
    for (const [key, bucket] of Object.entries(metrics.endpointLatency.byEndpoint)) {
        latency[key] = {
            count: bucket.count,
            avgMs: bucket.count > 0 ? Math.round((bucket.totalMs / bucket.count) * 100) / 100 : 0,
            maxMs: bucket.maxMs,
            minMs: Number.isFinite(bucket.minMs) ? bucket.minMs : 0,
        };
    }

    return {
        timestamp: new Date().toISOString(),
        endpointLatency: latency,
        failures: { ...metrics.failures },
    };
}

