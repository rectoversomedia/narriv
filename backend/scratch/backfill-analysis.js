/**
 * Enqueue AI analysis jobs for ALL signals that don't have an analysis yet.
 * Run once after fixing the queue.js job ID bug.
 */
import prisma from "../src/prisma.js";
import { addAnalysisJob } from "../src/lib/queue.js";
import connection from "../src/lib/redis.js";

const signals = await prisma.signal.findMany({
  where: {
    analyses: { none: {} }
  },
  select: { id: true, title: true }
});

console.log(`Found ${signals.length} signals without analysis. Enqueueing...`);

let success = 0;
let fail = 0;

for (const signal of signals) {
  try {
    await addAnalysisJob(signal.id);
    success++;
    if (success % 10 === 0) {
      console.log(`  Progress: ${success}/${signals.length}`);
    }
  } catch (err) {
    console.error(`  Failed to enqueue ${signal.id}: ${err.message}`);
    fail++;
  }
}

console.log(`\n✅ Done. Enqueued: ${success} | Failed: ${fail}`);
console.log("The backend worker will now process these jobs...");

await prisma.$disconnect();
setTimeout(() => {
  connection.disconnect();
  process.exit(0);
}, 2000);
