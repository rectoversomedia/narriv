import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.signal.groupBy({
    by: ['platform', 'sourceName'],
    _count: true
  });
  console.log(count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
