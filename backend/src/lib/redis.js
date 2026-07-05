import dotenv from "dotenv";
import { logStructured } from "./logger.js";

dotenv.config();

// Check if Redis is disabled via environment
const isRedisDisabled = process.env.ENABLE_WORKERS !== 'true' || !process.env.REDIS_URL;

// Create a mock connection object if Redis is disabled
// Must implement methods that BullMQ expects
let connection;

if (isRedisDisabled) {
    // Mock Redis for when workers are disabled
    logStructured("info", "redis_disabled", { reason: "ENABLE_WORKERS != true or REDIS_URL not set" });

    // Create a proper mock that won't throw
    class MockRedis {
        constructor() {
            this.status = 'ready';
            this.mockMode = true;
        }
        on() { return this; }
        off() { return this; }
        connect() { return Promise.resolve(); }
        disconnect() { return Promise.resolve(); }
        quit() { return Promise.resolve(); }
        duplicate() { return new MockRedis(); }
        sendCommand() { return Promise.resolve(); }
        subscribe() { return Promise.resolve(); }
        unsubscribe() { return Promise.resolve(); }
        psubscribe() { return Promise.resolve(); }
        punsubscribe() { return Promise.resolve(); }
        ping() { return Promise.resolve('PONG'); }
        get() { return Promise.resolve(null); }
        set() { return Promise.resolve('OK'); }
        del() { return Promise.resolve(1); }
        incr() { return Promise.resolve(1); }
        expire() { return Promise.resolve(1); }
        mget() { return Promise.resolve([]); }
        keys() { return Promise.resolve([]); }
        scan() { return Promise.resolve([0, []]); }
        evalsha() { return Promise.resolve([]); }
        // BullMQ specific
        addEventListener() {}
        removeEventListener() {}
        emit() {}
        removeAllListeners() { return this; }
    }

    connection = new MockRedis();
} else {
    // Dynamic import to avoid issues when disabled
    const Redis = await import("ioredis");
    const redisOptions = {
        maxRetriesPerRequest: null, // Required by BullMQ
        connectTimeout: 10000,
        lazyConnect: true,
    };

    connection = new Redis.default(process.env.REDIS_URL, redisOptions);

    connection.on("error", (err) => {
        if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
            logStructured("warn", "redis_connection_refused", { message: "Redis not available, falling back to mock" });
            return;
        }
        if (err.message && err.message.includes("ECONNRESET")) return;
        logStructured("error", "redis_error", { message: err.message });
    });

    connection.on("connect", () => {
        logStructured("info", "redis_connected");
    });
}

export default connection;
