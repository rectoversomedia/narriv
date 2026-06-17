import prisma from './src/prisma.js';

async function test() {
  try {
    const existing = await prisma.source.findFirst({
      where: {
        name: "Test",
        type: { not: "deleted" },
      },
    });
    console.log("Success:", existing);
  } catch (e) {
    console.error("Prisma error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test();