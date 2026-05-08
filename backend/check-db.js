import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Testing database connection...");
    try {
        await prisma.$connect();
        console.log("✅ Successfully connected to the database.");
    } catch (error) {
        console.error("❌ Failed to connect to the database.");
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
