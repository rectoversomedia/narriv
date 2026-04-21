import { addAnalysisJob } from "../src/lib/queue.js";
import prisma from "../src/prisma.js";

async function test() {
    console.log("Starting queue test...");
    
    // Find a signal to test with
    const signal = await prisma.signal.findFirst();
    
    if (!signal) {
        console.error("No signals found in database. Please run ingestion first.");
        process.exit(1);
    }
    
    console.log(`Found signal: ${signal.title} (${signal.id})`);
    
    // Add job to queue
    await addAnalysisJob(signal.id);
    
    console.log("Job added. Waiting 5 seconds for worker to process...");
    
    // Wait for worker to finish
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check if SignalAnalysis was created
    const analysis = await prisma.signalAnalysis.findFirst({
        where: { signalId: signal.id },
        orderBy: { createdAt: 'desc' }
    });
    
    if (analysis) {
        console.log("Success! Analysis found in DB:");
        console.log(JSON.stringify(analysis, null, 2));
    } else {
        console.log("Failure: No analysis found in DB after 10 seconds.");
    }
    
    process.exit(0);
}

test().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
