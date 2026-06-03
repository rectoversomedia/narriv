import Redis from "ioredis";
import dotenv from "dotenv";
import { logStructured } from "./logger.js";

dotenv.config();

const redisOptions = {
    maxRetriesPerRequest: null, // Required by BullMQ
};

const connection = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, redisOptions)
    : new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
        ...redisOptions,
    });

connection.on("error", (err) => {
    logStructured("error", "redis_error", { message: err.message });
});

connection.on("connect", () => {
    logStructured("info", "redis_connected");
});

export default connection;
