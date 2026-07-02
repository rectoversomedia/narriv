import Redis from "ioredis";
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
    connection = {
        status: 'ready',
        on: () => connection,
        off: () => connection,
        connect: () => Promise.resolve(),
        disconnect: () => Promise.resolve(),
        quit: () => Promise.resolve(),
        duplicate: () => connection,
        sendCommand: () => Promise.resolve(),
        subscribe: () => Promise.resolve(),
        unsubscribe: () => Promise.resolve(),
       psubscribe: () => Promise.resolve(),
        punsubscribe: () => Promise.resolve(),
        ping: () => Promise.resolve('PONG'),
        // Required by BullMQ
        addEventListener: () => {},
        removeEventListener: () => {},
        emit: () => {},
        removeAllListeners: () => connection,
    };
} else {
    const redisOptions = {
        maxRetriesPerRequest: null, // Required by BullMQ
    };

    connection = new Redis(process.env.REDIS_URL, redisOptions);

    connection.on("error", (err) => {
        if (err.message && err.message.includes("ECONNRESET")) return;
        logStructured("error", "redis_error", { message: err.message });
    });

    connection.on("connect", () => {
        logStructured("info", "redis_connected");
    });
}

export default connection;
