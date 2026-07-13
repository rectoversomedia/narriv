/**
 * Video Walkthrough Content Data
 *
 * Contains script outlines, key topics, and metadata for each tutorial video.
 * This can be used to generate video transcripts, subtitles, or content summaries.
 */

export interface VideoScriptSection {
  timestamp: string;
  title: string;
  description: string;
  keyPoints: string[];
}

export interface VideoWalkthrough {
  id: string;
  title: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  thumbnailGradient: string;
  description: string;
  targetAudience: string[];
  prerequisites: string[];
  keyTopics: string[];
  scriptOutline: VideoScriptSection[];
}

export const videoWalkthroughs: VideoWalkthrough[] = [
  {
    id: "platform-overview",
    title: "Platform Overview",
    duration: "5:32",
    durationSeconds: 332,
    thumbnail: "overview",
    thumbnailGradient: "from-indigo-500 to-purple-600",
    description: "Get started with Narriv by understanding the core platform capabilities, navigation, and key features that help you monitor and respond to digital narratives.",
    targetAudience: ["New users", "Team leads", "Stakeholders evaluating the platform"],
    prerequisites: [],
    keyTopics: [
      "Platform navigation and dashboard layout",
      "Understanding signals and data sources",
      "Alert system basics",
      "AI-powered insights overview",
      "Team collaboration features",
    ],
    scriptOutline: [
      {
        timestamp: "0:00",
        title: "Introduction",
        description: "Welcome viewers and set expectations for the tutorial",
        keyPoints: [
          "Welcome to Narriv - your narrative intelligence platform",
          "This 5-minute overview covers essential features",
          "By the end, you'll understand the platform's core capabilities",
        ],
      },
      {
        timestamp: "0:30",
        title: "What is Narriv?",
        description: "Explain the platform's purpose and value proposition",
        keyPoints: [
          "Narrative intelligence and operational response platform",
          "Monitor digital signals across multiple sources",
          "Detect risks and opportunities in real-time",
          "Generate actionable reports and AI-assisted responses",
        ],
      },
      {
        timestamp: "1:15",
        title: "Dashboard Overview",
        description: "Tour the main dashboard interface",
        keyPoints: [
          "Command center with KPIs and signal volume",
          "Quick actions panel for common tasks",
          "Health and status widgets",
          "Recent activity feed",
        ],
      },
      {
        timestamp: "2:00",
        title: "Signal Monitoring",
        description: "Explain how signals are collected and analyzed",
        keyPoints: [
          "Signals represent mentions across data sources",
          "AI classifies and analyzes each signal",
          "Sentiment detection (positive, negative, neutral)",
          "Filtering and search capabilities",
        ],
      },
      {
        timestamp: "3:00",
        title: "Alert System",
        description: "Overview of the predictive alerting system",
        keyPoints: [
          "Automatic anomaly and risk detection",
          "Custom alert rules based on keywords",
          "Escalation matrix for team response",
          "Multiple notification channels (email, Slack, Teams)",
        ],
      },
      {
        timestamp: "4:00",
        title: "AI Features",
        description: "Preview the AI-powered capabilities",
        keyPoints: [
          "AI signal analysis with confidence scores",
          "Narrative clustering to identify themes",
          "AI-generated action plans",
          "Visibility reports and competitor analysis",
        ],
      },
      {
        timestamp: "4:45",
        title: "Reports & Collaboration",
        description: "Wrap up with reporting and team features",
        keyPoints: [
          "Report templates and custom reports",
          "Scheduled automated reports",
          "Team roles and permissions",
          "Workspace settings and integrations",
        ],
      },
      {
        timestamp: "5:15",
        title: "Next Steps",
        description: "Guide viewers to next learning resources",
        keyPoints: [
          "Deeper dives available for each feature",
          "Check out other video tutorials",
          "Support resources and documentation links",
        ],
      },
    ],
  },
  {
    id: "dashboard-deep-dive",
    title: "Dashboard Deep Dive",
    duration: "8:15",
    durationSeconds: 495,
    thumbnail: "dashboard",
    thumbnailGradient: "from-blue-500 to-cyan-600",
    description: "Master the Narriv dashboard with detailed explanations of every widget, metric, and interaction pattern. Learn to customize your view and leverage all available data.",
    targetAudience: ["Regular users", "Data analysts", "Team managers", "Dashboard customization enthusiasts"],
    prerequisites: ["Completed Platform Overview", "Basic understanding of narrative monitoring"],
    keyTopics: [
      "Customizing dashboard widgets",
      "Understanding all KPI metrics",
      "Date range filtering and comparison",
      "Exporting dashboard data",
      "Setting up dashboard shortcuts",
    ],
    scriptOutline: [
      {
        timestamp: "0:00",
        title: "Introduction",
        description: "Overview of what we'll cover in this deep dive",
        keyPoints: [
          "8-minute comprehensive dashboard tour",
          "We'll cover every widget and interaction",
          "Tips for customization and efficiency",
        ],
      },
      {
        timestamp: "0:30",
        title: "Main Layout Structure",
        description: "Understanding the dashboard grid system",
        keyPoints: [
          "Responsive grid layout explanation",
          "Widget types and categories",
          "Drag-and-drop customization basics",
          "Save and reset layout options",
        ],
      },
      {
        timestamp: "1:30",
        title: "Command Center Widgets",
        description: "Deep dive into the main overview widgets",
        keyPoints: [
          "Signal volume trends (hourly/daily/weekly)",
          "Sentiment distribution pie chart",
          "Active sources status indicators",
          "AI confidence meter",
        ],
      },
      {
        timestamp: "2:45",
        title: "Quick Actions Panel",
        description: "Streamlining common tasks",
        keyPoints: [
          "One-click source creation",
          "Quick alert setup shortcuts",
          "Report generation buttons",
          "Custom shortcut configuration",
        ],
      },
      {
        timestamp: "3:45",
        title: "Filters and Date Ranges",
        description: "Mastering data filtering capabilities",
        keyPoints: [
          "Preset date ranges (today, 7d, 30d, custom)",
          "Comparison mode (vs previous period)",
          "Source-specific filtering",
          "Keyword and sentiment filters",
        ],
      },
      {
        timestamp: "4:45",
        title: "Detailed Metrics Breakdown",
        description: "Understanding the numbers behind the charts",
        keyPoints: [
          "Total signals and unique mentions",
          "Engagement metrics explained",
          "Geographic distribution maps",
          "Platform breakdown analysis",
        ],
      },
      {
        timestamp: "5:45",
        title: "Widget Customization",
        description: "Personalizing your dashboard experience",
        keyPoints: [
          "Adding and removing widgets",
          "Widget size and position",
          "Color theme customization",
          "Dark mode considerations",
        ],
      },
      {
        timestamp: "6:45",
        title: "Data Export",
        description: "Exporting dashboard data for external use",
        keyPoints: [
          "CSV export for all metrics",
          "PDF report generation",
          "Scheduled export automation",
          "API access for developers",
        ],
      },
      {
        timestamp: "7:30",
        title: "Pro Tips and Shortcuts",
        description: "Efficiency tips for power users",
        keyPoints: [
          "Keyboard shortcuts reference",
          "Bookmarking filtered views",
          "Dashboard templates",
          "Team dashboard sharing",
        ],
      },
    ],
  },
  {
    id: "setting-up-alerts",
    title: "Setting Up Alerts",
    duration: "6:45",
    durationSeconds: 405,
    thumbnail: "alerts",
    thumbnailGradient: "from-red-500 to-orange-600",
    description: "Configure effective alert rules to detect narrative trends, brand risks, and opportunities. Learn the alert system architecture, escalation matrices, and notification channels.",
    targetAudience: ["Risk managers", "PR teams", "Community managers", "Operations leads"],
    prerequisites: ["Added at least one data source", "Understanding of monitoring keywords"],
    keyTopics: [
      "Alert types and detection modes",
      "Creating custom alert rules",
      "Setting up escalation matrices",
      "Configuring notification channels",
      "Alert fatigue management",
    ],
    scriptOutline: [
      {
        timestamp: "0:00",
        title: "Introduction to Alerts",
        description: "Why alerts are critical for narrative intelligence",
        keyPoints: [
          "Real-time monitoring vs periodic review",
          "Alert system architecture overview",
          "Types of alerts (predictive, rule-based, anomaly)",
          "The importance of timely response",
        ],
      },
      {
        timestamp: "0:45",
        title: "Alert Types Explained",
        description: "Understanding different alert categories",
        keyPoints: [
          "Predictive alerts - AI detects emerging trends",
          "Rule-based alerts - keyword and threshold triggers",
          "Anomaly alerts - unusual pattern detection",
          "Velocity alerts - rapid volume changes",
        ],
      },
      {
        timestamp: "1:45",
        title: "Creating Your First Alert",
        description: "Step-by-step alert rule creation",
        keyPoints: [
          "Navigate to Alerts > Create New",
          "Choose alert type",
          "Set conditions and thresholds",
          "Test the alert before activation",
        ],
      },
      {
        timestamp: "2:45",
        title: "Advanced Rule Configuration",
        description: "Fine-tuning alert conditions",
        keyPoints: [
          "Keyword matching (AND, OR, NOT)",
          "Sentiment thresholds",
          "Source filtering",
          "Exclusion lists",
          "Confidence score minimums",
        ],
      },
      {
        timestamp: "3:45",
        title: "Escalation Matrix Setup",
        description: "Defining response workflows",
        keyPoints: [
          "Severity levels (low, medium, high, critical)",
          "Time-based escalation rules",
          "Assignee rotation",
          "Handoff procedures",
        ],
      },
      {
        timestamp: "4:45",
        title: "Notification Channels",
        description: "Configuring where alerts are delivered",
        keyPoints: [
          "Email notifications with templates",
          "Slack integration",
          "Microsoft Teams integration",
          "Webhook for custom systems",
          "SMS for critical alerts",
        ],
      },
      {
        timestamp: "5:30",
        title: "Managing Alert Volume",
        description: "Avoiding alert fatigue",
        keyPoints: [
          "Grouping similar alerts",
          "Deduplication rules",
          "Quiet hours configuration",
          "Alert prioritization",
        ],
      },
      {
        timestamp: "6:15",
        title: "Alert Monitoring",
        description: "Tracking alert effectiveness",
        keyPoints: [
          "Alert response metrics",
          "False positive tracking",
          "Alert history and audit trail",
          "Continuous optimization tips",
        ],
      },
    ],
  },
  {
    id: "ai-action-plans",
    title: "AI Action Plans",
    duration: "7:20",
    durationSeconds: 440,
    thumbnail: "ai",
    thumbnailGradient: "from-emerald-500 to-teal-600",
    description: "Harness Narriv's AI to automatically generate actionable response plans based on detected signals. Learn the AI analysis workflow and how to refine AI suggestions.",
    targetAudience: ["Strategy leads", "Communications teams", "Crisis response coordinators", "AI-assisted workflow enthusiasts"],
    prerequisites: ["Understanding of alerts and signals", "Basic familiarity with action plans concept"],
    keyTopics: [
      "How AI analyzes signals for action generation",
      "Generating AI-powered response plans",
      "Customizing AI plan templates",
      "Human-in-the-loop approval workflows",
      "Feedback loop for AI improvement",
    ],
    scriptOutline: [
      {
        timestamp: "0:00",
        title: "Introduction to AI Action Plans",
        description: "Overview of AI-powered response generation",
        keyPoints: [
          "What are AI Action Plans?",
          "The challenge of rapid response",
          "How AI bridges analysis to action",
          "Human-AI collaboration philosophy",
        ],
      },
      {
        timestamp: "0:45",
        title: "AI Analysis Workflow",
        description: "Understanding how AI processes signals",
        keyPoints: [
          "Signal collection and aggregation",
          "Context extraction and classification",
          "Sentiment and intent analysis",
          "Stakeholder identification",
          "Historical pattern matching",
        ],
      },
      {
        timestamp: "1:45",
        title: "Triggering Action Plans",
        description: "Different ways to generate AI plans",
        keyPoints: [
          "Automatic triggers from alerts",
          "Manual generation from signal selection",
          "Scheduled periodic reports",
          "API-triggered generation",
        ],
      },
      {
        timestamp: "2:30",
        title: "Plan Structure",
        description: "Understanding AI-generated plan components",
        keyPoints: [
          "Situation summary",
          "Key stakeholders list",
          "Recommended actions (prioritized)",
          "Timeline and milestones",
          "Resource requirements",
          "Risk assessment",
        ],
      },
      {
        timestamp: "3:30",
        title: "Generating Your First Plan",
        description: "Live demonstration of plan generation",
        keyPoints: [
          "Select relevant signals",
          "Choose plan template",
          "Set parameters and constraints",
          "Generate and review plan",
        ],
      },
      {
        timestamp: "4:30",
        title: "Customizing Templates",
        description: "Tailoring AI plans to your workflow",
        keyPoints: [
          "Creating custom templates",
          "Defining standard response playbooks",
          "Incorporating brand voice guidelines",
          "Setting default stakeholders and channels",
        ],
      },
      {
        timestamp: "5:30",
        title: "Human Review Workflow",
        description: "Approval and refinement process",
        keyPoints: [
          "Review queue management",
          "Editing AI suggestions",
          "Approving and rejecting items",
          "Adding human-only insights",
          "Collaboration and comments",
        ],
      },
      {
        timestamp: "6:20",
        title: "Feedback Loop",
        description: "Improving AI performance over time",
        keyPoints: [
          "Rating plan quality",
          "Flagging ineffective recommendations",
          "Tracking plan execution outcomes",
          "Model improvement through feedback",
        ],
      },
      {
        timestamp: "7:00",
        title: "Best Practices",
        description: "Tips for maximizing AI effectiveness",
        keyPoints: [
          "Start with high-quality signals",
          "Iterate on templates regularly",
          "Balance automation and oversight",
          "Measure and optimize continuously",
        ],
      },
    ],
  },
];

export function getVideoById(id: string): VideoWalkthrough | undefined {
  return videoWalkthroughs.find((v) => v.id === id);
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
