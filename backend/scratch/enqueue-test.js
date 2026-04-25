import prisma from "../src/prisma.js";
import { addAnalysisJob } from "../src/lib/queue.js";
import connection from "../src/lib/redis.js";

// Ambil 3 signal terbaru yang belum ada analisisnya
const signals = await prisma.signal.findMany({
  where: {
    analyses: { none: {} }
  },
  take: 3,
  orderBy: { capturedAt: "desc" }
});

console.log(`Signals tanpa analisis (sample 3): ${signals.length}`);

for (const signal of signals) {
  console.log(`\nEnqueue signal: ${signal.id} - "${signal.title?.substring(0, 60)}"`);
  await addAnalysisJob(signal.id);
}

console.log("\nSelesai menambahkan jobs ke queue.");
console.log("Tunggu beberapa detik lalu cek apakah SignalAnalysis terbuat...");

await prisma.$disconnect();

// Jangan disconnect redis dulu biar job bisa jalan
setTimeout(() => {
  connection.disconnect();
  process.exit(0);
}, 3000);
