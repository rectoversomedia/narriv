import { Activity, BellRing, Eye, ThumbsUp } from "lucide-react";

export const commandMetrics = [
  { label: "AI Visibility Score", value: "82", delta: "+7 pts vs last week", icon: Eye },
  { label: "Narratives Detected", value: "18", delta: "6 high-velocity clusters", icon: Activity },
  { label: "Predictive Alerts", value: "5", delta: "2 require review today", icon: BellRing },
  { label: "Actions Accepted", value: "74%", delta: "+11% learning lift", icon: ThumbsUp },
];

export const narrativeClusters = [
  { title: "Trust in AI-generated planning", confidence: 92, sources: "News, X, Reddit", sentiment: "positive", velocity: "+31%", evidence: 148 },
  { title: "Procurement risk around opaque vendors", confidence: 86, sources: "LinkedIn, analyst blogs", sentiment: "negative", velocity: "+18%", evidence: 74 },
  { title: "Competitor claims faster implementation", confidence: 79, sources: "YouTube, search prompts", sentiment: "mixed", velocity: "+12%", evidence: 51 },
];

export const predictiveAlerts = [
  { id: "alert-1", title: "Competitor narrative likely to peak in 36 hours", probability: 84, window: "36h", owner: "Comms", status: "Review", severity: "high", drivers: ["LinkedIn velocity +42%", "3 analyst mentions", "Search prompt share down 8pts"] },
  { id: "alert-2", title: "Positive AI visibility gap emerging in enterprise prompts", probability: 71, window: "72h", owner: "Growth", status: "Ready", severity: "medium", drivers: ["Brand cited in 8/12 prompts", "Competitor omission increasing", "GEO article rank improved"] },
  { id: "alert-3", title: "Procurement risk discussion needs executive proof point", probability: 63, window: "5d", owner: "PR", status: "Monitor", severity: "medium", drivers: ["Forum thread density +22%", "Negative sentiment concentration", "No current proof asset"] },
];

export const geoVisibility = {
  score: 82,
  brandPresenceRate: 68,
  competitorMentionRate: 44,
  prompts: [
    { prompt: "Best AI narrative intelligence platform for enterprise comms", brand: "Mentioned", competitors: "2 competitors", recommendation: "Add comparison proof and enterprise security language" },
    { prompt: "Tools for predicting reputational risk from social signals", brand: "Not cited", competitors: "3 competitors", recommendation: "Publish predictive alert explainer with schema examples" },
    { prompt: "GEO analytics platform for brand visibility in AI answers", brand: "Mentioned", competitors: "1 competitor", recommendation: "Strengthen GEO landing page with use-case snippets" },
  ],
};

export const actionRecommendations = [
  { title: "Publish executive proof point", impact: "High", effort: "Medium", channel: "Owned + PR", confidence: 88, steps: ["Draft 450-word proof post", "Attach 2 customer-safe evidence points", "Route through comms approval", "Measure prompt citation lift"] },
  { title: "Counter competitor speed claim", impact: "Medium", effort: "Low", channel: "Sales enablement", confidence: 81, steps: ["Create 3-bullet response card", "Add implementation timeline benchmark", "Push to AE workspace"] },
  { title: "Improve GEO answer coverage", impact: "High", effort: "Medium", channel: "SEO / GEO", confidence: 84, steps: ["Create prompt-targeted FAQ", "Add structured comparison table", "Refresh schema metadata"] },
];

export const signals = [
  { source: "LinkedIn", sentiment: "positive", excerpt: "Enterprise teams are asking for narrative intelligence that connects signals to recommended action, not dashboards alone.", narrative: "Trust in AI-generated planning", confidence: 91, recommendation: "Amplify as thought-leadership proof." },
  { source: "Analyst Blog", sentiment: "negative", excerpt: "Opaque vendor scoring remains a blocker for procurement teams evaluating reputation intelligence systems.", narrative: "Procurement risk", confidence: 84, recommendation: "Create explainability proof point." },
  { source: "AI Prompt Result", sentiment: "mixed", excerpt: "Narriv is recognized for narrative monitoring, but competitors are cited more often for execution workflows.", narrative: "Competitor speed claim", confidence: 79, recommendation: "Publish Action Engine comparison." },
];

export const reports = [
  { title: "Weekly Narrative Intelligence Brief", readiness: 92, sections: "Signals, clusters, GEO, actions", status: "Ready for exec review" },
  { title: "AI Visibility Movement Report", readiness: 76, sections: "Prompt set, citations, competitors", status: "Needs GEO annotations" },
  { title: "Predictive Risk Review", readiness: 64, sections: "Drivers, owner actions, learning loop", status: "Awaiting comms feedback" },
];

export const dataSources = [
  { name: "Google News Brand Corpus", type: "News", health: "Healthy", coverage: "91%", latency: "12m" },
  { name: "LinkedIn Executive Mentions", type: "Social", health: "Healthy", coverage: "84%", latency: "18m" },
  { name: "AI Prompt Benchmark Set", type: "GEO", health: "Review", coverage: "68%", latency: "1h" },
  { name: "Reddit Procurement Threads", type: "Community", health: "Healthy", coverage: "77%", latency: "24m" },
];
