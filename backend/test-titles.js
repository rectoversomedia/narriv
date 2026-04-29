import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const signals = await prisma.signal.findMany({ select: { title: true, platform: true } });
  console.log(signals);
}
main().catch(console.error).finally(() => prisma.$disconnect());
