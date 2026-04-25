import connection from "../src/lib/redis.js";
import { Queue } from "bullmq";

const queue = new Queue("ai-analysis", { connection });

const waiting = await queue.getWaiting();
const active  = await queue.getActive();
const failed  = await queue.getFailed();
const completed = await queue.getCompleted();
const delayed = await queue.getDelayed();

console.log("=== QUEUE STATUS ===");
console.log(`Waiting:   ${waiting.length}`);
console.log(`Active:    ${active.length}`);
console.log(`Failed:    ${failed.length}`);
console.log(`Completed: ${completed.length}`);
console.log(`Delayed:   ${delayed.length}`);

if (failed.length > 0) {
  console.log("\n=== FAILED JOBS (last 3) ===");
  failed.slice(0, 3).forEach(job => {
    console.log(`Job ID: ${job.id}`);
    console.log(`  data: ${JSON.stringify(job.data)}`);
    console.log(`  failedReason: ${job.failedReason}`);
    console.log(`  stacktrace: ${job.stacktrace?.[0]?.substring(0, 300)}`);
  });
}

if (waiting.length > 0) {
  console.log("\n=== WAITING JOBS (first 3) ===");
  waiting.slice(0, 3).forEach(job => {
    console.log(`Job ID: ${job.id} | data: ${JSON.stringify(job.data)}`);
  });
}

await queue.close();
connection.disconnect();
