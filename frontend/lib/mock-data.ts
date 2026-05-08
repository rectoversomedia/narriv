import { Activity, BellRing, Eye, ThumbsUp } from "lucide-react";

export const commandMetrics = [
  { label: "AI Visibility Score", value: "82", delta: "+7 pts vs last week", icon: Eye },
  { label: "Topics Found", value: "18", delta: "6 fast-growing topics", icon: Activity },
  { label: "Early Warnings", value: "5", delta: "2 need review today", icon: BellRing },
  { label: "Actions Accepted", value: "74%", delta: "+11% improvement", icon: ThumbsUp },
];

export const narrativeClusters = [
  { title: "Trust in AI planning tools", confidence: 92, sources: "News, X, Reddit", sentiment: "positive", velocity: "+31%", evidence: 148 },
  { title: "Buyers want clearer vendor scoring", confidence: 86, sources: "LinkedIn, analyst blogs", sentiment: "negative", velocity: "+18%", evidence: 74 },
  { title: "Competitor claims faster implementation", confidence: 79, sources: "YouTube, search prompts", sentiment: "mixed", velocity: "+12%", evidence: 51 },
];

export const predictiveAlerts = [
  { id: "alert-1", title: "Competitor topic may peak in 36 hours", probability: 84, window: "36h", owner: "Comms", status: "Review", severity: "high", drivers: ["LinkedIn mentions +42%", "3 analyst mentions", "Search visibility down 8 pts"] },
  { id: "alert-2", title: "Brand is gaining visibility in enterprise AI answers", probability: 71, window: "72h", owner: "Growth", status: "Ready", severity: "medium", drivers: ["Brand cited in 8/12 questions", "Competitors mentioned less often", "AI visibility article improved"] },
  { id: "alert-3", title: "Buyer trust concern needs proof from leadership", probability: 63, window: "5d", owner: "PR", status: "Monitor", severity: "medium", drivers: ["Forum discussion +22%", "Negative sentiment is concentrated", "No current proof page"] },
];

export const geoVisibility = {
  score: 82,
  brandPresenceRate: 68,
  competitorMentionRate: 44,
  prompts: [
    { prompt: "Best AI tool for brand and reputation teams", brand: "Mentioned", competitors: "2 competitors", recommendation: "Add clear comparison proof and security details" },
    { prompt: "Tools for spotting reputation risks from social media", brand: "Not cited", competitors: "3 competitors", recommendation: "Publish a clear early-warning explainer" },
    { prompt: "How to improve brand visibility in AI answers", brand: "Mentioned", competitors: "1 competitor", recommendation: "Strengthen the AI visibility landing page with examples" },
  ],
};

export const actionRecommendations = [
  { title: "Publish leadership proof point", impact: "High", effort: "Medium", channel: "Owned + PR", confidence: 88, steps: ["Draft a short proof post", "Add 2 safe evidence points", "Send for comms approval", "Measure whether AI answers cite it"] },
  { title: "Respond to competitor speed claim", impact: "Medium", effort: "Low", channel: "Sales support", confidence: 81, steps: ["Create a 3-point response card", "Add implementation timeline proof", "Share with sales team"] },
  { title: "Improve AI answer visibility", impact: "High", effort: "Medium", channel: "SEO / AI Visibility", confidence: 84, steps: ["Create FAQ for priority questions", "Add a simple comparison table", "Refresh page metadata"] },
];

export const signals = [
  { source: "LinkedIn", sentiment: "positive", excerpt: "Enterprise teams are asking for narrative intelligence that connects signals to recommended action, not dashboards alone.", narrative: "Trust in AI-generated planning", confidence: 91, recommendation: "Amplify as thought-leadership proof." },
  { source: "Analyst Blog", sentiment: "negative", excerpt: "Opaque vendor scoring remains a blocker for procurement teams evaluating reputation intelligence systems.", narrative: "Procurement risk", confidence: 84, recommendation: "Create explainability proof point." },
  { source: "AI Prompt Result", sentiment: "mixed", excerpt: "Narriv is recognized for narrative monitoring, but competitors are cited more often for execution workflows.", narrative: "Competitor speed claim", confidence: 79, recommendation: "Publish Action Engine comparison." },
];

export const reports = [
  { title: "Weekly Narrative Intelligence Brief", readiness: 92, sections: "Signals, topics, AI visibility, actions", status: "Ready for exec review" },
  { title: "AI Visibility Movement Report", readiness: 76, sections: "Questions, citations, competitors", status: "Needs AI visibility notes" },
  { title: "Predictive Risk Review", readiness: 64, sections: "Drivers, owner actions, feedback", status: "Awaiting comms feedback" },
];

export const dataSources = [
  { name: "Google News Brand Mentions", type: "News", health: "Healthy", coverage: "91%", latency: "12m" },
  { name: "LinkedIn Executive Mentions", type: "Social", health: "Healthy", coverage: "84%", latency: "18m" },
  { name: "AI Answer Test Questions", type: "AI", health: "Review", coverage: "68%", latency: "1h" },
  { name: "Reddit Procurement Threads", type: "Community", health: "Healthy", coverage: "77%", latency: "24m" },
];
