import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisConfig = {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    maxRetriesPerRequest: null, // Required by BullMQ
};

const connection = new Redis(redisConfig);

connection.on("error", (err) => {
    console.error("[REDIS] Error:", err.message);
});

connection.on("connect", () => {
    console.log("[REDIS] Connected to Redis");
});

export default connection;
