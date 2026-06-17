import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bell,
  Briefcase,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  Headphones,
  Home,
  LineChart,
  MessageCircle,
  Newspaper,
  Search,
  Settings,
  Sparkles,
  Target,
  Users,
  Webhook,
} from "lucide-react";

export type Localized = Record<"en" | "id", string>;
export type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate";

export function text(value: Localized, language: string) {
  return value[language as "en" | "id"];
}

export const navGroups = [
  {
    key: "main",
    items: [
      { key: "command", href: "/", icon: Home },
      { key: "signals", href: "/signals", icon: Activity },
      { key: "alerts", href: "/alerts", icon: Bell },
      { key: "visibility", href: "/visibility", icon: Search },
    ],
  },
  {
    key: "analysis",
    items: [
      { key: "intelligence", href: "/intelligence", icon: BarChart3 },
      { key: "reports", href: "/reports", icon: FileText },
    ],
  },
  {
    key: "action",
    items: [
      { key: "actionCenter", href: "/action-plans", icon: Target },
      { key: "cases", href: "/workspace/cases", icon: Briefcase },
    ],
  },
  {
    key: "system",
    items: [
      { key: "dataSources", href: "/workspace/sources", icon: Database },
      { key: "activity", href: "/workspace/activity", icon: Clock3 },
      { key: "integrations", href: "/workspace/integrations", icon: Webhook },
      { key: "settings", href: "/workspace/settings", icon: Settings },
    ],
  },
];

export const dashboardMetrics: Array<{ label: Localized; value: string; helper: Localized; icon: LucideIcon; tone: Tone }> = [
  { label: { en: "Total Signals (24h)", id: "Total Sinyal (24 Jam)" }, value: "2.842", helper: { en: "+18.3% vs yesterday", id: "+18,3% vs kemarin" }, icon: Activity, tone: "purple" },
  { label: { en: "Critical Signals", id: "Sinyal Kritis" }, value: "128", helper: { en: "+12% vs yesterday", id: "+12% vs kemarin" }, icon: Activity, tone: "red" },
  { label: { en: "Active Signals", id: "Sinyal Aktif" }, value: "1.862", helper: { en: "+15.6% vs yesterday", id: "+15,6% vs kemarin" }, icon: CheckCircle2, tone: "green" },
  { label: { en: "AI Visibility Mentions", id: "AI Visibility Mentions" }, value: "2.451", helper: { en: "+18.7% vs yesterday", id: "+18,7% vs kemarin" }, icon: Sparkles, tone: "blue" },
  { label: { en: "Average Response", id: "Rata-rata Respon" }, value: "17m 24s", helper: { en: "8m 12s faster", id: "8m 12s lebih cepat" }, icon: Clock3, tone: "purple" },
  { label: { en: "Active Sources", id: "Sumber Aktif" }, value: "48 / 62", helper: { en: "77% connected", id: "77% terhubung" }, icon: Database, tone: "purple" },
];

export const topTopics = [
  { name: { en: "Service disruption", id: "Layanan Gangguan" }, mentions: "1.248", delta: "+24,5%", tone: "green" as Tone },
  { name: { en: "App update", id: "Update Aplikasi" }, mentions: "842", delta: "+18,3%", tone: "green" as Tone },
  { name: { en: "New promo", id: "Promo Terbaru" }, mentions: "621", delta: "+12,7%", tone: "green" as Tone },
  { name: { en: "Account security", id: "Keamanan Akun" }, mentions: "498", delta: "-4,3%", tone: "red" as Tone },
  { name: { en: "Privacy policy", id: "Kebijakan Privasi" }, mentions: "368", delta: "-6,2%", tone: "red" as Tone },
];

export const sources = [
  { name: "Social Media", status: { en: "Active", id: "Aktif" }, health: { en: "Good", id: "Baik" }, signals: "1.248", icon: MessageCircle, tone: "purple" as Tone },
  { name: "News", status: { en: "Active", id: "Aktif" }, health: { en: "Good", id: "Baik" }, signals: "643", icon: Newspaper, tone: "blue" as Tone },
  { name: "Forums", status: { en: "Active", id: "Aktif" }, health: { en: "Good", id: "Baik" }, signals: "398", icon: Users, tone: "green" as Tone },
  { name: "Support Tickets", status: { en: "Active", id: "Aktif" }, health: { en: "Good", id: "Baik" }, signals: "287", icon: Headphones, tone: "amber" as Tone },
  { name: "App Reviews", status: { en: "Active", id: "Aktif" }, health: { en: "Good", id: "Baik" }, signals: "182", icon: LineChart, tone: "purple" as Tone },
];


export const quickActions = [
  { key: "newAlert", icon: Bell },
  { key: "report", icon: FileText },
  { key: "analyze", icon: BarChart3 },
  { key: "sources", icon: Database },
  { key: "settings", icon: Settings },
  { key: "help", icon: Headphones },
];

export const systemStatus = ["Platform", "AI Engine", "Data Pipeline", "Integrasi", "Penyimpanan"];
