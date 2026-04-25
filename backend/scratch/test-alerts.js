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
        
        const alerts = await detectAlerts(workspace.id);
        console.log(`Alerts detected: ${alerts.length}`);
        
        alerts.forEach((a, i) => {
            console.log(`\n[ALERT ${i + 1}] ${a.severity.toUpperCase()}: ${a.title}`);
            console.log(`Type: ${a.type}`);
            console.log(`What Happened: ${a.whatHappened}`);
        });

    } catch (err) {
        console.error("Test failed:", err);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

run();
