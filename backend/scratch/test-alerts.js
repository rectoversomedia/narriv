import prisma from "../src/prisma.js";
import { detectAlerts } from "../src/modules/alerts/alerts.service.js";

async function run() {
    try {
        const workspaces = await prisma.workspace.findMany();
        if (workspaces.length === 0) {
            console.log("No workspaces found.");
            return;
        }

        const workspace = workspaces[0];
        console.log(`Running alert detection for workspace: ${workspace.name} (${workspace.id})`);
        
        await prisma.alert.deleteMany();
        console.log("Cleared old alerts to force generation for testing...");
        
        const alerts = await detectAlerts(workspace.id);
        console.log(`Alerts detected via rule engine: ${alerts.length}`);
        
        alerts.forEach((a, i) => {
            console.log(`\n[ALERT ${i + 1}] ${a.severity.toUpperCase()}: ${a.title}`);
            console.log(`Type: ${a.type}`);
            console.log(`What Happened: ${a.whatHappened}`);
            console.log(`Why It Matters: ${a.whyItMatters}`);
            console.log(`What To Do: ${a.whatToDo}`);
        });

        // Test the AI enhancement directly
        const { enhanceAlert } = await import("../src/modules/ai/ai.service.js");
        const fakeAlert = {
            type: "risk",
            severity: "high",
            title: "Fake Test Alert",
            whatHappened: "A lot of negative sentiment was detected today."
        };
        const fakeContext = "[NEGATIVE] Product breaks easily\nThe new update bricked my device completely...\n\n[NEGATIVE] Horrible support\nI have been on hold for 3 hours...";
        
        console.log("\n--- Testing enhanceAlert directly ---");
        const enhanced = await enhanceAlert(fakeAlert, fakeContext);
        console.log("Why It Matters:", enhanced.whyItMatters);
        console.log("What To Do:", enhanced.whatToDo);

    } catch (err) {
        console.error("Test failed:", err);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

run();
