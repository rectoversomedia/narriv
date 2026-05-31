import Redis from "ioredis";
import dotenv from "dotenv";
import { logStructured } from "./logger.js";

dotenv.config();

const redisConfig = {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    maxRetriesPerRequest: null, // Required by BullMQ
};

const connection = new Redis(redisConfig);

connection.on("error", (err) => {
    logStructured("error", "redis_error", { message: err.message });
});

connection.on("connect", () => {
    logStructured("info", "redis_connected");
});

export default connection;
