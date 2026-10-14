import type { LucideIcon } from "lucide-react";
import { Activity, BarChart3, Bell, CheckCircle2, Clock3, Database, FileText, Home, MessageCircle, Search, Settings, Webhook } from "lucide-react";

// Primary navigation follows the user's journey (understand, interpret,
// decide, act); configuration lives under Administration. `match` lists the
// existing routes that belong to an item, so old URLs keep working.
export const navGroups: Array<{ key: string; items: Array<{ key: string; href: string; icon: LucideIcon; match?: string[] }> }> = [
  {
    key: "main",
    items: [
      { key: "command", href: "/", icon: Home },
      { key: "signals", href: "/signals", icon: Activity },
      { key: "intelligence", href: "/intelligence", icon: BarChart3 },
      { key: "alerts", href: "/alerts", icon: Bell },
      { key: "visibility", href: "/visibility", icon: Search },
      { key: "askNarriv", href: "/ask", icon: MessageCircle },
      { key: "reports", href: "/reports", icon: FileText, match: ["/brief"] },
      { key: "actions", href: "/action-center", icon: CheckCircle2, match: ["/action-plans", "/workspace/cases"] },
    ],
  },
  {
    key: "system",
    items: [
      { key: "dataSources", href: "/workspace/sources", icon: Database },
      { key: "integrations", href: "/workspace/integrations", icon: Webhook },
      { key: "activity", href: "/workspace/activity", icon: Clock3 },
      { key: "settings", href: "/workspace/settings", icon: Settings },
    ],
  },
];

// Pages joined under one navigation item by tabs (existing routes unchanged).
export const SECTION_TABS = {
  reports: [
    { key: "reportsTab", href: "/reports" },
    { key: "brief", href: "/brief" },
  ],
  actions: [
    { key: "actionsTab", href: "/action-center" },
    { key: "actionCenter", href: "/action-plans" },
    { key: "cases", href: "/workspace/cases" },
  ],
} as const;
