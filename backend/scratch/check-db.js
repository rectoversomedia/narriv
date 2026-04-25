import prisma from "../src/prisma.js";

const signals = await prisma.signal.count();
const analyses = await prisma.signalAnalysis.count();
const sources = await prisma.source.count();
const workspaces = await prisma.workspace.count();
const members = await prisma.workspaceMember.count();

console.log("=== DB STATUS ===");
console.log(`Workspaces:       ${workspaces}`);
console.log(`WorkspaceMembers: ${members}`);
console.log(`Sources:          ${sources}`);
console.log(`Signals:          ${signals}`);
console.log(`SignalAnalyses:   ${analyses}`);

if (signals > 0) {
  const latest = await prisma.signal.findFirst({
    orderBy: { capturedAt: "desc" },
    include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  console.log("\n=== LATEST SIGNAL ===");
  console.log(`ID:        ${latest.id}`);
  console.log(`Title:     ${latest.title}`);
  console.log(`Sentiment: ${latest.sentiment}`);
  console.log(`Analyses:  ${latest.analyses.length}`);
  if (latest.analyses.length > 0) {
    console.log(`  → sentiment: ${latest.analyses[0].sentiment}`);
    console.log(`  → narrativeType: ${latest.analyses[0].narrativeType}`);
  }
}

await prisma.$disconnect();
