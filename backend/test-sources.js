import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sources = await prisma.source.findMany({ select: { id: true, name: true, type: true } });
  console.log("SOURCES:", sources);
  
  const signals = await prisma.signal.findMany({ select: { id: true, sourceName: true, sourceType: true, platform: true }});
  console.log("SIGNALS (first 5):", signals.slice(0, 5));
  console.log("UNIQUE SIGNAL PLATFORMS:", [...new Set(signals.map(s => s.platform))]);
}

main().catch(console.error).finally(() => prisma.$disconnect());
