import type { LucideIcon } from "lucide-react";
import { Bell, BellRing, Briefcase, Database, FileText, History, Home, LayoutDashboard, Lightbulb, ListChecks, MessagesSquare, Network, Newspaper, Send, Settings, SlidersHorizontal, Sparkles } from "lucide-react";

// Five menus, each answering one question a director has:
//   Hari Ini — what is happening and what do I decide today?
//   Isu — what are people saying, and which of it is dangerous?
//   Peringatan & Tugas — what needs handling, who owns it, how far along is it?
//   Laporan — what do I send to the board or the client?
//   Pengaturan — what is monitored, and where do notifications go?
// Ask Narriv is the floating button on every page, not a menu. `match` lists the existing routes that belong to
// an item, so old URLs keep working and light up the right menu.
export const navGroups: Array<{ key: string; items: Array<{ key: string; href: string; icon: LucideIcon; match?: string[] }> }> = [
  {
    key: "main",
    items: [
      { key: "today", href: "/", icon: Home, match: ["/brief"] },
      { key: "issues", href: "/signals", icon: MessagesSquare, match: ["/intelligence", "/opportunities", "/insights", "/timeline"] },
      { key: "tasks", href: "/alerts", icon: Bell, match: ["/alert-center", "/action-center", "/action-plans", "/actions", "/workspace/cases"] },
      { key: "reports", href: "/reports", icon: FileText, match: ["/visibility"] },
      { key: "settings", href: "/workspace/settings", icon: Settings, match: ["/workspace/sources", "/workspace/integrations", "/workspace/activity"] },
    ],
  },
];

// The pages inside each menu, shown as tabs at the top of those pages (existing routes unchanged).
// `satisfies` keeps the literal keys for the translation lookups while checking every tab has an icon.
export const SECTION_TABS = {
  today: [
    { key: "todayTab", href: "/", icon: LayoutDashboard },
    { key: "brief", href: "/brief", icon: Newspaper },
  ],
  issues: [
    { key: "conversations", href: "/signals", icon: MessagesSquare },
    { key: "issueMap", href: "/intelligence", icon: Network },
  ],
  tasks: [
    { key: "alertsTab", href: "/alerts", icon: BellRing },
    { key: "actionsTab", href: "/action-center", icon: Lightbulb },
    { key: "actionCenter", href: "/action-plans", icon: ListChecks },
    { key: "cases", href: "/workspace/cases", icon: Briefcase },
  ],
  reports: [
    { key: "reportsTab", href: "/reports", icon: FileText },
    { key: "visibility", href: "/visibility", icon: Sparkles },
  ],
  settings: [
    { key: "settingsTab", href: "/workspace/settings", icon: SlidersHorizontal },
    { key: "dataSources", href: "/workspace/sources", icon: Database },
    { key: "integrations", href: "/workspace/integrations", icon: Send },
    { key: "activity", href: "/workspace/activity", icon: History },
  ],
} as const satisfies Record<string, ReadonlyArray<{ key: string; href: string; icon: LucideIcon }>>;

export type SectionKey = keyof typeof SECTION_TABS;

/** The menu whose tabs include this exact page, or null (detail pages and pages outside the menus get no tabs). */
export function sectionForPath(pathname: string): SectionKey | null {
  const entry = (Object.entries(SECTION_TABS) as Array<[SectionKey, ReadonlyArray<{ href: string }>]>).find(([, tabs]) => tabs.some((tab) => tab.href === pathname));
  return entry ? entry[0] : null;
}
