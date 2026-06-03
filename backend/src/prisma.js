import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

// Graceful shutdown
process.on("beforeExit", async () => {
    await prisma.$disconnect();
});

process.on("SIGINT", async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    process.exit(0);
});

export default prisma;
