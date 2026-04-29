import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    await prisma.signalAnalysis.deleteMany();
    await prisma.signal.deleteMany();
    await prisma.rawDocument.deleteMany();
    await prisma.ingestionJob.deleteMany();
    console.log("Deleted all old signals to clear the mix-up.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
