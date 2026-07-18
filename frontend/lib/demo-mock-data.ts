/**
 * demo-mock-data.ts
 *
 * Provides comprehensive mock data for Demo Mode across all pages.
 * Used when backend is unreachable or user is in demo session.
 */

import type {
  DashboardSummary,
  GlobalActivitySummary,
  TrendPoint,
  LatestSignal,
  Alert,
  PaginatedResponse,
  MetaPaginatedResponse,
  ActionQueueRecord,
  NarrativeRecord,
  VisibilityResponse,
  SourceRecord,
  IntegrationRecord,
} from "./api-service";

// ---------------------------------------------------------------------------
// Demo Mode Detection
// ---------------------------------------------------------------------------

/**
 * Check if current session is demo mode
 */
export function isDemoMode(): boolean {
  // SSR check
  if (typeof window === "undefined") return false;

  try {
    // 1. Check URL search params first (most reliable for demo mode)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("demo") === "true" || urlParams.get("mode") === "demo") {
      return true;
    }

    // 2. Check Zustand persist store (narriv-auth)
    const authStateStr = localStorage.getItem("narriv-auth");
    if (authStateStr) {
      const authState = JSON.parse(authStateStr);
      const token = authState?.state?.token || authState?.token;
      const userProvider = authState?.state?.user?.provider || authState?.user?.provider;

      // Check if provider is "demo"
      if (userProvider === "demo") {
        return true;
      }

      // Check if token starts with "demo-token-"
      if (token && typeof token === "string" && token.startsWith("demo-token-")) {
        return true;
      }
    }

    // 3. Check legacy demo token keys for backwards compatibility
    const legacyToken = localStorage.getItem("narriv_demo_token");
    const legacyUser = localStorage.getItem("narriv_demo_user");
    if (legacyToken && legacyUser) {
      const user = JSON.parse(legacyUser);
      if (user?.provider === "demo") {
        return true;
      }
    }
  } catch {
    // ignore errors
  }

  return false;
}

// ---------------------------------------------------------------------------
// Mock Data Generators
// ---------------------------------------------------------------------------

/**
 * Generate mock trend data for the last N days
 */
function generateTrendData(days: number): TrendPoint[] {
  const trends: TrendPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    trends.push({
      date: date.toISOString().split("T")[0],
      count: Math.floor(Math.random() * 500) + 200 + (days - i) * 10,
    });
  }
  return trends;
}

/**
 * Generate mock latest signals
 */
function generateLatestSignals(): LatestSignal[] {
  const platforms = ["Twitter", "Facebook", "Instagram", "Reddit", "News", "TikTok"];
  const sentiments = ["positive", "neutral", "negative", "positive", "neutral"];
  const titles = [
    "Service disruption affecting users in Southeast Asia",
    "New app update receives mixed reactions",
    "Exclusive promo for loyal customers announced",
    "Security update addresses recent vulnerabilities",
    "New privacy policy raises concerns among users",
    "Customer support response times improve significantly",
    "App performance optimization updates released",
    "Community guidelines update announced",
  ];

  const signals: LatestSignal[] = [];
  const now = new Date();

  for (let i = 0; i < 10; i++) {
    const publishedAt = new Date(now);
    publishedAt.setMinutes(publishedAt.getMinutes() - i * 15);

    signals.push({
      id: `demo-signal-${i + 1}`,
      title: titles[i % titles.length],
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
      published_at: publishedAt.toISOString(),
    });
  }
  return signals;
}

/**
 * Generate mock global activity data
 */
function generateGlobalActivity(): GlobalActivitySummary {
  return {
    updated_at: new Date().toISOString(),
    total_signals: 12847,
    countries: [
      { id: "ID", name: "Indonesia", signals: 4821, level: "high", latest_at: new Date().toISOString() },
      { id: "US", name: "United States", signals: 2156, level: "high", latest_at: new Date().toISOString() },
      { id: "GB", name: "United Kingdom", signals: 1243, level: "medium", latest_at: new Date().toISOString() },
      { id: "MY", name: "Malaysia", signals: 987, level: "medium", latest_at: new Date().toISOString() },
      { id: "SG", name: "Singapore", signals: 756, level: "medium", latest_at: new Date().toISOString() },
      { id: "AU", name: "Australia", signals: 654, level: "medium", latest_at: new Date().toISOString() },
      { id: "JP", name: "Japan", signals: 523, level: "low", latest_at: new Date().toISOString() },
      { id: "TH", name: "Thailand", signals: 412, level: "low", latest_at: new Date().toISOString() },
      { id: "PH", name: "Philippines", signals: 389, level: "low", latest_at: new Date().toISOString() },
      { id: "VN", name: "Vietnam", signals: 345, level: "low", latest_at: new Date().toISOString() },
    ],
    markers: [
      { name: "Jakarta", countryId: "ID", coordinates: [-6.2088, 106.8456], signals: 2156, level: "high", latest_at: new Date().toISOString() },
      { name: "New York", countryId: "US", coordinates: [40.7128, -74.006], signals: 1243, level: "high", latest_at: new Date().toISOString() },
      { name: "London", countryId: "GB", coordinates: [51.5074, -0.1278], signals: 987, level: "medium", latest_at: new Date().toISOString() },
      { name: "Kuala Lumpur", countryId: "MY", coordinates: [3.139, 101.6869], signals: 756, level: "medium", latest_at: new Date().toISOString() },
      { name: "Singapore", countryId: "SG", coordinates: [1.3521, 103.8198], signals: 654, level: "medium", latest_at: new Date().toISOString() },
      { name: "Sydney", countryId: "AU", coordinates: [-33.8688, 151.2093], signals: 523, level: "low", latest_at: new Date().toISOString() },
      { name: "Tokyo", countryId: "JP", coordinates: [35.6762, 139.6503], signals: 412, level: "low", latest_at: new Date().toISOString() },
      { name: "Bangkok", countryId: "TH", coordinates: [13.7563, 100.5018], signals: 389, level: "low", latest_at: new Date().toISOString() },
      { name: "Manila", countryId: "PH", coordinates: [14.5995, 120.9842], signals: 345, level: "low", latest_at: new Date().toISOString() },
      { name: "Ho Chi Minh", countryId: "VN", coordinates: [10.8231, 106.6297], signals: 312, level: "low", latest_at: new Date().toISOString() },
    ],
  };
}

// ---------------------------------------------------------------------------
// Dashboard Mock Data
// ---------------------------------------------------------------------------

/**
 * Get complete mock dashboard summary for demo mode
 */
export function getMockDashboardSummary(): DashboardSummary {
  const trends = generateTrendData(30);
  const latestSignals = generateLatestSignals();
  const globalActivity = generateGlobalActivity();

  return {
    kpis: {
      total_signals: 12847,
      analyzed_signals: 11234,
      positive_percentage: 42,
      negative_percentage: 18,
      neutral_percentage: 32,
      mixed_percentage: 8,
    },
    trends,
    sentiment_distribution: {
      positive: 4718,
      neutral: 3597,
      negative: 2021,
      mixed: 898,
    },
    platform_distribution: [
      { platform: "Twitter", count: 4821 },
      { platform: "Facebook", count: 2456 },
      { platform: "Instagram", count: 1892 },
      { platform: "Reddit", count: 1234 },
      { platform: "News", count: 1456 },
      { platform: "TikTok", count: 988 },
    ],
    latest_signals: latestSignals,
    global_activity: globalActivity,
    top_topics: [
      { name: { en: "Service disruption", id: "Gangguan layanan" }, mentions: "1.2K", delta: "+12%", tone: "green" },
      { name: { en: "App update", id: "Update aplikasi" }, mentions: "842", delta: "+8%", tone: "blue" },
      { name: { en: "New promo", id: "Promo baru" }, mentions: "621", delta: "+5%", tone: "purple" },
      { name: { en: "Account security", id: "Keamanan akun" }, mentions: "498", delta: "-3%", tone: "red" },
      { name: { en: "Privacy policy", id: "Kebijakan privasi" }, mentions: "368", delta: "+2%", tone: "amber" },
      { name: { en: "Support quality", id: "Kualitas dukungan" }, mentions: "287", delta: "+15%", tone: "green" },
    ],
    mini_topics: [
      { label: "Service disruption", value: "1.2K", tone: "green" },
      { label: "App update", value: "842", tone: "blue" },
      { label: "New promo", value: "621", tone: "purple" },
      { label: "Account security", value: "498", tone: "red" },
      { label: "Privacy policy", value: "368", tone: "amber" },
      { label: "Support quality", value: "287", tone: "green" },
    ],
    sources_health: [
      { name: "Twitter/X", status: { en: "Active", id: "Aktif" }, health: { en: "Healthy", id: "Sehat" }, signals: "4.2K", tone: "green" },
      { name: "Facebook", status: { en: "Active", id: "Aktif" }, health: { en: "Healthy", id: "Sehat" }, signals: "2.1K", tone: "green" },
      { name: "Instagram", status: { en: "Active", id: "Aktif" }, health: { en: "Healthy", id: "Sehat" }, signals: "1.8K", tone: "green" },
      { name: "News Sites", status: { en: "Active", id: "Aktif" }, health: { en: "Warning", id: "Peringatan" }, signals: "923", tone: "amber" },
      { name: "Reddit", status: { en: "Paused", id: "Dijeda" }, health: { en: "Unknown", id: "Tidak diketahui" }, signals: "412", tone: "slate" },
    ],
    system_status: ["Platform", "AI Engine", "Data Pipeline", "Integrasi", "Penyimpanan"],
  };
}

// ---------------------------------------------------------------------------
// Signals Mock Data
// ---------------------------------------------------------------------------

export function getMockSignals(): PaginatedResponse<{
  id: string;
  title: string | null;
  content: string;
  platform: string | null;
  sentiment: string | null;
  publishedAt: string | null;
  capturedAt: string;
}> {
  const now = new Date();
  const signals = [];

  for (let i = 0; i < 20; i++) {
    const publishedAt = new Date(now.getTime() - i * 30 * 60 * 1000);
    const platforms = ["Twitter", "Facebook", "Instagram", "Reddit", "News", "TikTok"];
    const sentiments = ["positive", "neutral", "negative"];

    signals.push({
      id: `demo-sig-${i}`,
      title: [
        "Service disruption affecting users in Southeast Asia",
        "New app update receives mixed reactions",
        "Exclusive promo for loyal customers announced",
        "Security update addresses recent vulnerabilities",
        "Customer support response times improve significantly",
        "App performance optimization updates released",
        "Community guidelines update announced",
        "New features coming in next release",
        "Users praise improved user experience",
        "Bug fixes address reported issues",
      ][i % 10],
      content: "This is a sample signal content that would normally come from social media monitoring, news aggregation, or other data sources.",
      platform: platforms[i % platforms.length],
      sentiment: sentiments[i % sentiments.length],
      publishedAt: publishedAt.toISOString(),
      capturedAt: new Date(publishedAt.getTime() - 5 * 60 * 1000).toISOString(),
    });
  }

  return {
    data: signals,
    pagination: {
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
    },
  };
}

// ---------------------------------------------------------------------------
// Alerts Mock Data
// ---------------------------------------------------------------------------

export function getMockAlerts(): Alert[] {
  const now = new Date();
  const alerts: Alert[] = [
    {
      id: "demo-alert-1",
      title: "Service disruption affecting users in Southeast Asia",
      whatHappened: "Multiple users reporting inability to access core services",
      whyItMatters: "Affects approximately 15,000 active users in the region",
      whatToDo: "Investigate server logs and coordinate with infrastructure team",
      severity: "critical",
      status: "open",
      type: "outage",
      assignedTo: "John Smith",
      assignedTeam: "Infrastructure",
      deadline: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      escalationLevel: "high",
      createdAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
    },
    {
      id: "demo-alert-2",
      title: "New app update receives mixed reactions",
      whatHappened: "App Store reviews showing mixed sentiment about latest release",
      whyItMatters: "Could impact user retention and app ratings",
      whatToDo: "Monitor sentiment and prepare response strategy",
      severity: "medium",
      status: "acknowledged",
      type: "sentiment",
      assignedTo: "Sarah Johnson",
      assignedTeam: "Marketing",
      deadline: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
      escalationLevel: "medium",
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "demo-alert-3",
      title: "Exclusive promo for loyal customers announced",
      whatHappened: "New loyalty program generating positive buzz on social media",
      whyItMatters: "Opportunity to capitalize on positive sentiment",
      whatToDo: "Track engagement metrics and customer feedback",
      severity: "low",
      status: "open",
      type: "campaign",
      assignedTo: "Mike Chen",
      assignedTeam: "Marketing",
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "demo-alert-4",
      title: "Security update addresses recent vulnerabilities",
      whatHappened: "Patch deployed addressing 3 critical security vulnerabilities",
      whyItMatters: "Essential for maintaining user trust and compliance",
      whatToDo: "Verify all systems are patched and monitor for issues",
      severity: "high",
      status: "resolved",
      type: "security",
      assignedTo: "Alex Kumar",
      assignedTeam: "Security",
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "demo-alert-5",
      title: "New privacy policy raises concerns among users",
      whatHappened: "Users expressing concerns about data collection practices",
      whyItMatters: "May impact user trust and regulatory compliance",
      whatToDo: "Review policy with legal team and prepare FAQ for users",
      severity: "medium",
      status: "in_progress",
      type: "compliance",
      assignedTo: "Lisa Wong",
      assignedTeam: "Legal",
      deadline: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(),
      escalationLevel: "medium",
      createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
    },
  ];
  return alerts;
}

// ---------------------------------------------------------------------------
// Action Plans Mock Data
// ---------------------------------------------------------------------------

export function getMockActionPlans(): MetaPaginatedResponse<ActionQueueRecord> {
  const now = new Date();
  return {
    data: [
      {
        id: "demo-plan-1",
        title: "Monitor Service Disruption Response",
        alert: { title: "Service disruption affecting users", severity: "critical" },
        cluster: null,
        assignedTo: "John Smith",
        assignedTeam: "Infrastructure",
        deadline: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
        escalationLevel: "high",
        workflowStatus: "active",
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "demo-plan-2",
        title: "App Update Feedback Analysis",
        alert: { title: "New app update receives mixed reactions", severity: "medium" },
        cluster: null,
        assignedTo: "Sarah Johnson",
        assignedTeam: "Marketing",
        deadline: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        escalationLevel: "medium",
        workflowStatus: "in_progress",
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "demo-plan-3",
        title: "Loyalty Program Launch",
        alert: { title: "Exclusive promo for loyal customers", severity: "low" },
        cluster: null,
        assignedTo: "Mike Chen",
        assignedTeam: "Marketing",
        deadline: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString(),
        escalationLevel: "low",
        workflowStatus: "active",
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "demo-plan-4",
        title: "Privacy Policy Communication",
        alert: { title: "New privacy policy raises concerns", severity: "medium" },
        cluster: null,
        assignedTo: "Lisa Wong",
        assignedTeam: "Legal",
        deadline: null,
        escalationLevel: "medium",
        workflowStatus: "done",
        createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(),
      },
    ],
    meta: { page: 1, limit: 10, total: 4 },
  };
}

// ---------------------------------------------------------------------------
// Reports Mock Data
// ---------------------------------------------------------------------------

export function getMockReports(): PaginatedResponse<{
  id: string;
  title: string;
  sections: unknown;
  readiness: number;
  status: string;
}> {
  const now = new Date();
  return {
    data: [
      {
        id: "demo-report-1",
        title: "Weekly Sentiment Overview",
        sections: ["Executive Summary", "Key Metrics", "Sentiment Analysis", "Recommendations"],
        readiness: 95,
        status: "ready",
      },
      {
        id: "demo-report-2",
        title: "Service Disruption Analysis",
        sections: ["Incident Timeline", "Root Cause", "Impact Assessment", "Action Items"],
        readiness: 100,
        status: "ready",
      },
      {
        id: "demo-report-3",
        title: "Monthly Executive Summary",
        sections: ["Overview", "Trends", "Alerts", "Action Plans"],
        readiness: 30,
        status: "draft",
      },
      {
        id: "demo-report-4",
        title: "Competitive Analysis Q2",
        sections: ["Market Share", "Sentiment Comparison", "Opportunities"],
        readiness: 75,
        status: "review",
      },
    ],
    pagination: { page: 1, limit: 10, total: 4, totalPages: 1 },
  };
}

// ---------------------------------------------------------------------------
// Intelligence/Narratives Mock Data
// ---------------------------------------------------------------------------

export function getMockNarratives(): PaginatedResponse<NarrativeRecord> {
  return {
    data: [
      {
        id: "demo-narrative-1",
        title: "Service Quality Concerns",
        description: "Users reporting issues with service reliability and performance",
        sourceCount: 5,
        confidence: 87,
        impact: "high",
        velocity: "+45%",
        recommendedFocus: "Investigate infrastructure issues and communicate updates to users",
        signalCount: 1247,
        sentiment: "negative",
      },
      {
        id: "demo-narrative-2",
        title: "New Feature Reception",
        description: "Mixed reactions to recent app update with new features",
        sourceCount: 4,
        confidence: 82,
        impact: "medium",
        velocity: "+23%",
        recommendedFocus: "Monitor feedback and prepare feature improvements",
        signalCount: 892,
        sentiment: "mixed",
      },
      {
        id: "demo-narrative-3",
        title: "Customer Loyalty Program",
        description: "Positive response to new loyalty and rewards initiative",
        sourceCount: 3,
        confidence: 91,
        impact: "high",
        velocity: "+67%",
        recommendedFocus: "Capitalize on momentum with follow-up campaigns",
        signalCount: 654,
        sentiment: "positive",
      },
      {
        id: "demo-narrative-4",
        title: "Security Awareness",
        description: "Increased discussion around account security and privacy",
        sourceCount: 4,
        confidence: 78,
        impact: "medium",
        velocity: "+12%",
        recommendedFocus: "Provide clear security guidance and updates",
        signalCount: 423,
        sentiment: "neutral",
      },
      {
        id: "demo-narrative-5",
        title: "Support Quality Praise",
        description: "Customers sharing positive support experiences",
        sourceCount: 2,
        confidence: 85,
        impact: "low",
        velocity: "+8%",
        recommendedFocus: "Share positive stories and recognize support team",
        signalCount: 287,
        sentiment: "positive",
      },
    ],
    pagination: { page: 1, limit: 10, total: 5, totalPages: 1 },
  };
}

// ---------------------------------------------------------------------------
// Visibility Mock Data
// ---------------------------------------------------------------------------

export function getMockVisibility(): VisibilityResponse {
  return {
    score: 68,
    presence: 72,
    presenceMentions: "847 of 1,200",
    competitor: 28,
    prompts: [
      {
        prompt: "How to contact customer support",
        engine: "ChatGPT",
        brand: "Narriv",
        competitor: "CompetitorA",
        brandTone: "positive",
        compTone: "neutral",
      },
      {
        prompt: "Best project management tool comparison",
        engine: "Claude",
        brand: "Narriv",
        competitor: "Asana",
        brandTone: "neutral",
        compTone: "positive",
      },
      {
        prompt: "Free task management alternatives",
        engine: "Gemini",
        brand: "Narriv",
        competitor: "Notion",
        brandTone: "neutral",
        compTone: "positive",
      },
    ],
    geoActions: [
      { title: "Create FAQ section about common support questions", tag: "Content", highlighted: true },
      { title: "Prepare response template for pricing inquiries", tag: "Sales" },
      { title: "Develop comparison landing page highlighting unique features", tag: "Marketing", highlighted: true },
    ],
  };
}

// ---------------------------------------------------------------------------
// Sources Mock Data
// ---------------------------------------------------------------------------

export function getMockSources(): PaginatedResponse<SourceRecord> {
  const now = new Date();
  return {
    data: [
      {
        id: "demo-source-1",
        name: "Twitter/X Main Account",
        type: "social",
        actorId: "twitter_main",
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        health: "healthy",
        coverage: "98%",
        latency: "< 2s",
      },
      {
        id: "demo-source-2",
        name: "Facebook Page",
        type: "social",
        actorId: "fb_page",
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        health: "healthy",
        coverage: "95%",
        latency: "< 5s",
      },
      {
        id: "demo-source-3",
        name: "Instagram Business",
        type: "social",
        actorId: "ig_business",
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        health: "warning",
        coverage: "88%",
        latency: "< 10s",
      },
      {
        id: "demo-source-4",
        name: "Tech News RSS",
        type: "rss",
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        health: "healthy",
        coverage: "100%",
        latency: "< 30s",
      },
      {
        id: "demo-source-5",
        name: "Reddit Communities",
        type: "social",
        actorId: "reddit_tech",
        isActive: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        health: "unknown",
        coverage: "0%",
        latency: "-",
      },
    ],
    pagination: { page: 1, limit: 50, total: 5, totalPages: 1 },
  };
}

// ---------------------------------------------------------------------------
// Integrations Mock Data
// ---------------------------------------------------------------------------

export function getMockIntegrations(): { data: IntegrationRecord[] } {
  const now = new Date();
  return {
    data: [
      {
        id: "demo-integration-1",
        workspaceId: "demo-workspace",
        name: "Slack #alerts",
        platform: "slack",
        status: "active",
        config: { channel: "#alerts", severity_filter: "high" },
        lastSyncAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        errorMessage: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "demo-integration-2",
        workspaceId: "demo-workspace",
        name: "Microsoft Teams",
        platform: "teams",
        status: "active",
        config: { channel: "Alerts" },
        lastSyncAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
        errorMessage: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "demo-integration-3",
        workspaceId: "demo-workspace",
        name: "Custom Webhook",
        platform: "webhook",
        status: "inactive",
        config: { url: "https://example.com/webhook" },
        lastSyncAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        errorMessage: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Cases Mock Data
// ---------------------------------------------------------------------------

export function getMockCases(): { data: Array<{
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  sourceType: string | null;
  sourceId: string | null;
  assignedTo: string | null;
  assignedTeam: string | null;
  deadline: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
}>; meta: { page: number; limit: number; total: number; totalPages: number } } {
  const now = new Date();
  return {
    data: [
      {
        id: "demo-case-1",
        workspaceId: "demo-workspace",
        title: "Investigate Service Disruption Reports",
        description: "Multiple users reporting service unavailability",
        status: "open",
        priority: "high",
        sourceType: "alert",
        sourceId: "demo-alert-1",
        assignedTo: "John Smith",
        assignedTeam: "Infrastructure",
        deadline: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
        resolution: null,
        createdAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "demo-case-2",
        workspaceId: "demo-workspace",
        title: "Review Privacy Policy Feedback",
        description: "Users expressing concerns about data practices",
        status: "in_progress",
        priority: "medium",
        sourceType: "alert",
        sourceId: "demo-alert-5",
        assignedTo: "Lisa Wong",
        assignedTeam: "Legal",
        deadline: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(),
        resolution: null,
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "demo-case-3",
        workspaceId: "demo-workspace",
        title: "App Update Bug Reports",
        description: "Users reporting bugs after latest update",
        status: "resolved",
        priority: "medium",
        sourceType: "signal",
        sourceId: "demo-sig-2",
        assignedTo: "Dev Team",
        assignedTeam: "Engineering",
        deadline: null,
        resolution: "Bug fixes deployed in v2.3.1",
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    meta: { page: 1, limit: 10, total: 3, totalPages: 1 },
  };
}

// ---------------------------------------------------------------------------
// Activity Logs Mock Data
// ---------------------------------------------------------------------------

export function getMockActivityLogs(): { data: Array<{
  id: string;
  userId: string | null;
  user: { id: string; name: string | null; email: string } | null;
  event: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}>; meta: { page: number; limit: number; total: number; totalPages: number; summary?: { actors: number; today: number; eventTypes: number } } } {
  const now = new Date();
  return {
    data: [
      {
        id: "demo-activity-1",
        userId: "demo-user-1",
        user: { id: "demo-user-1", name: "John Smith", email: "john@example.com" },
        event: "alert_created",
        metadata: { alert_id: "demo-alert-1", severity: "critical" },
        createdAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      },
      {
        id: "demo-activity-2",
        userId: "demo-user-2",
        user: { id: "demo-user-2", name: "Sarah Johnson", email: "sarah@example.com" },
        event: "alert_status_changed",
        metadata: { alert_id: "demo-alert-2", old_status: "open", new_status: "acknowledged" },
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "demo-activity-3",
        userId: "demo-user-1",
        user: { id: "demo-user-1", name: "John Smith", email: "john@example.com" },
        event: "source_created",
        metadata: { source_id: "demo-source-1", source_name: "Twitter/X Main Account" },
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "demo-activity-4",
        userId: "demo-user-3",
        user: { id: "demo-user-3", name: "Mike Chen", email: "mike@example.com" },
        event: "report_generated",
        metadata: { report_id: "demo-report-1", report_title: "Weekly Sentiment Overview" },
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "demo-activity-5",
        userId: "demo-user-2",
        user: { id: "demo-user-2", name: "Sarah Johnson", email: "sarah@example.com" },
        event: "member_invited",
        metadata: { invited_email: "lisa@example.com", role: "analyst" },
        createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(),
      },
    ],
    meta: { page: 1, limit: 20, total: 5, totalPages: 1, summary: { actors: 3, today: 2, eventTypes: 5 } },
  };
}
