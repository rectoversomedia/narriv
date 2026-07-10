/**
 * demo-mock-data.ts
 *
 * Provides comprehensive mock data for Demo Mode dashboard.
 * Used when backend is unreachable but user is in demo session.
 */

import type {
  DashboardSummary,
  GlobalActivitySummary,
  TrendPoint,
  LatestSignal,
} from "./api-service";
import { dashboardMetrics, topTopics, sources } from "./mock-data";

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

/**
 * Generate mini topics for sparklines
 */
function generateMiniTopics() {
  return [
    { label: "Service disruption", value: "1.2K", tone: "green" },
    { label: "App update", value: "842", tone: "blue" },
    { label: "New promo", value: "621", tone: "purple" },
    { label: "Account security", value: "498", tone: "red" },
    { label: "Privacy policy", value: "368", tone: "amber" },
    { label: "Support quality", value: "287", tone: "green" },
  ];
}

/**
 * Generate sources health data
 */
function generateSourcesHealth() {
  return sources.map((source) => ({
    name: source.name,
    status: source.status,
    health: source.health,
    signals: source.signals,
    tone: source.tone,
  }));
}

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
    top_topics: topTopics,
    mini_topics: generateMiniTopics(),
    sources_health: generateSourcesHealth(),
    system_status: ["Platform", "AI Engine", "Data Pipeline", "Integrasi", "Penyimpanan"],
  };
}

/**
 * Check if current session is demo mode
 */
export function isDemoMode(): boolean {
  // SSR check
  if (typeof window === "undefined") return false;

  try {
    // 1. Check Zustand persist store (narriv-auth)
    const authStateStr = localStorage.getItem("narriv-auth");
    if (authStateStr) {
      const authState = JSON.parse(authStateStr);
      // Zustand persist format: state.user.provider
      if (authState?.state?.user?.provider === "demo") {
        return true;
      }
      // Alternative format: directly user.provider
      if (authState?.user?.provider === "demo") {
        return true;
      }
    }

    // 2. Check legacy demo token keys
    const demoToken = localStorage.getItem("narriv_demo_token");
    const demoUser = localStorage.getItem("narriv_demo_user");
    if (demoToken && demoUser) {
      const user = JSON.parse(demoUser);
      if (user?.provider === "demo") {
        return true;
      }
    }

    // 3. Check URL search params for demo mode (useful during development)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("demo") === "true" || urlParams.get("mode") === "demo") {
      return true;
    }

    // 4. Check if token starts with "demo-token-"
    const storedToken = localStorage.getItem("narriv-auth");
    if (storedToken) {
      const parsed = JSON.parse(storedToken);
      const token = parsed?.state?.token || parsed?.token;
      if (token && typeof token === "string" && token.startsWith("demo-token-")) {
        return true;
      }
    }
  } catch {
    // ignore errors
  }

  return false;
}
