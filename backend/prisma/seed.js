import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const workspace = await prisma.workspace.upsert({
        where: { slug: "demo-workspace" },
        update: {},
        create: {
            name: "Demo Workspace",
            slug: "demo-workspace",
        },
    });

    const existingVisibility = await prisma.aIVisibilityResult.count({
        where: { workspaceId: workspace.id },
    });

    if (existingVisibility === 0) {
        const visibility = await prisma.aIVisibilityResult.create({
            data: {
                workspaceId: workspace.id,
                engineName: "chatgpt",
                visibilityScore: 67,
                brandPresenceRate: 0.64,
                competitorMentionRate: 0.43,
                queryUsed: "demo prompt batch",
                metadata: {
                    localeReady: ["en", "id"],
                },
            },
        });

        await prisma.promptTestRun.createMany({
            data: [
                {
                    workspaceId: workspace.id,
                    aiVisibilityResultId: visibility.id,
                    prompt: "Best banks for international transfer in Indonesia",
                    engine: "ChatGPT",
                    brand: "Mentioned",
                    competitor: "2 competitors",
                    brandTone: "text-[#12B76A]",
                    compTone: "text-[#FDB022]",
                    highlighted: true,
                },
                {
                    workspaceId: workspace.id,
                    aiVisibilityResultId: visibility.id,
                    prompt: "Most reliable mobile banking app in Southeast Asia",
                    engine: "Perplexity",
                    brand: "Mentioned",
                    competitor: "1 competitor",
                    brandTone: "text-[#12B76A]",
                    compTone: "text-[#FDB022]",
                },
                {
                    workspaceId: workspace.id,
                    aiVisibilityResultId: visibility.id,
                    prompt: "Top fintech brands for SMEs in Jakarta",
                    engine: "Gemini",
                    brand: "Not mentioned",
                    competitor: "3 competitors",
                    brandTone: "text-[#F97066]",
                    compTone: "text-[#F97066]",
                },
            ],
        });

        console.log(`Seeded visibility demo data for workspaceId=${workspace.id}`);
    } else {
        console.log("Visibility demo data already exists. Skipping.");
    }

    const highRiskAlert = await prisma.alert.upsert({
        where: { id: "seed-alert-high-risk-1" },
        update: {},
        create: {
            id: "seed-alert-high-risk-1",
            workspaceId: workspace.id,
            type: "risk",
            severity: "high",
            title: "Delivery reliability complaints are rising",
            whatHappened: "Customer complaints about delays increased sharply across social and forums.",
            whyItMatters: "Trust signals are weakening and may influence AI answers plus procurement conversations.",
            whatToDo: "Prepare response messaging and publish proof points within 24 hours.",
            status: "open",
        },
    });

    const narrative = await prisma.narrativeCluster.upsert({
        where: { id: "seed-cluster-action-1" },
        update: {},
        create: {
            id: "seed-cluster-action-1",
            workspaceId: workspace.id,
            title: "Delivery reliability trust risk",
            description: "Negative mentions around delivery reliability are clustering and accelerating.",
            mainNarrative: "Trust degradation from repeated delay stories",
            sentiment: "negative",
            impact: "HIGH",
            signalCount: 148,
        },
    });

    const existingActionPlan = await prisma.actionPlan.findFirst({
        where: { workspaceId: workspace.id },
    });

    if (!existingActionPlan) {
        await prisma.actionPlan.create({
            data: {
                workspaceId: workspace.id,
                alertId: highRiskAlert.id,
                clusterId: narrative.id,
                title: "Crisis Response Action Plan",
                option1: JSON.stringify({
                    executive_summary: "Address rising reliability concerns with clear customer-first messaging.",
                    immediate_actions: [
                        "Publish short service update with verified timelines",
                        "Align customer support script for top 3 concerns",
                        "Route unresolved cases to response lead in 6 hours",
                        "Track sentiment and escalation daily",
                    ],
                    media_channels: ["Owned + PR"],
                }),
                option2: JSON.stringify({
                    executive_summary: "Delivery reliability complaints are becoming a trust issue across social media, communities, news, and AI answers.",
                    immediate_actions: [
                        "Publish a leadership note with service recovery commitments",
                        "Launch FAQ page with proof points and SLA transparency",
                        "Coordinate comms, support, and ops in a 24h war-room cadence",
                        "Measure AI-answer citation changes after publication",
                    ],
                    media_channels: ["Owned + PR", "Community", "Support"],
                }),
                option3: JSON.stringify({
                    executive_summary: "Run a high-visibility trust recovery sprint with cross-channel escalation.",
                    immediate_actions: [
                        "Announce recovery milestone dashboard publicly",
                        "Partner with priority customers for testimonial validation",
                        "Escalate operational owners with twice-daily updates",
                        "Trigger paid amplification for trust-focused updates",
                    ],
                    media_channels: ["Owned + PR + Paid"],
                }),
            },
        });

        console.log(`Seeded action plan demo data for workspaceId=${workspace.id}`);
    } else {
        console.log("Action plan demo data already exists. Skipping.");
    }

    const reportCount = await prisma.report.count({
        where: { workspaceId: workspace.id },
    });

    if (reportCount === 0) {
        await prisma.report.createMany({
            data: [
                {
                    workspaceId: workspace.id,
                    title: "Weekly Narrative Intelligence Brief",
                    summary: "Weekly rollup for signals, clusters, AI visibility, and recommended actions.",
                },
                {
                    workspaceId: workspace.id,
                    title: "AI Visibility Movement Report",
                    summary: "Prompt-set movement, citations, and competitor presence changes.",
                },
                {
                    workspaceId: workspace.id,
                    title: "Predictive Risk Review",
                    summary: "Risk drivers, owner actions, and feedback-loop status.",
                },
            ],
        });
        console.log(`Seeded reports demo data for workspaceId=${workspace.id}`);
    } else {
        console.log("Reports demo data already exists. Skipping.");
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
