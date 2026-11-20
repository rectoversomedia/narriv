import type { LucideIcon } from "lucide-react";
import { BadgeCheck, BarChart3, Rss, ScanSearch, ShieldCheck, UserSearch, Bell, BellRing, CalendarClock, Briefcase, Database, FileText, History, Home, LayoutDashboard, Lightbulb, ListChecks, MessagesSquare, Network, Send, Share2, SlidersHorizontal, Sparkle, Sparkles } from "lucide-react";

// Five menus, in the order a team works (see → understand → investigate → act → report), each answering one question:
//   Hari Ini — what is happening and what do I decide today? (incl. opportunities worth using today)
//   Isu — which stories are out there and which are dangerous? The Narrative Feed opens it.
//   Alat Analis — tools used when needed: check a claim, check a person or account, see what AI assistants answer.
//   Tindak Lanjut — what needs handling, who owns it, how far along is it? (its open count shows beside it)
//     Its tabs are the three steps of handling an issue in order (alert, plan, case), so they carry step numbers.
//     Recommendations are suggestions still waiting on a decision, so they live under Hari Ini.
//   Laporan — what do I send to the board or the client?
// Pengaturan (what is monitored, where notifications go) is not a menu: it opens from the account menu at the top
// right, and its pages still get their tabs.
// Ask Narriv is the floating button on every page, not a menu. `match` lists the existing routes that belong to
// an item, so old URLs keep working and light up the right menu.
export const navGroups: Array<{ key: string; items: Array<{ key: string; href: string; icon: LucideIcon; match?: string[] }> }> = [
  {
    key: "main",
    items: [
      { key: "today", href: "/", icon: Home, match: ["/brief", "/insights", "/action-center", "/opportunities"] },
      { key: "issues", href: "/feed", icon: MessagesSquare, match: ["/signals", "/intelligence", "/network", "/timeline"] },
      { key: "tools", href: "/cek-klaim", icon: ScanSearch, match: ["/recon", "/visibility"] },
      { key: "tasks", href: "/alerts", icon: Bell, match: ["/alert-center", "/action-plans", "/actions", "/workspace/cases"] },
      { key: "reports", href: "/reports", icon: FileText, match: ["/quality"] },
    ],
  },
];

/** Menus whose tabs are ordered steps of one flow; their tabs show a step number. */
export const STEPPED_SECTIONS: ReadonlyArray<string> = ["tasks"];

// The pages inside each menu, shown as tabs at the top of those pages (existing routes unchanged).
// `satisfies` keeps the literal keys for the translation lookups while checking every tab has an icon.
export const SECTION_TABS = {
  today: [
    { key: "todayTab", href: "/", icon: LayoutDashboard },
    { key: "actionsTab", href: "/action-center", icon: Lightbulb },
    { key: "opportunities", href: "/opportunities", icon: Sparkle },
    { key: "analysis", href: "/insights", icon: BarChart3 },
  ],
  issues: [
    { key: "feed", href: "/feed", icon: Rss },
    { key: "issueMap", href: "/intelligence", icon: Network },
    { key: "network", href: "/network", icon: Share2 },
    { key: "timeline", href: "/timeline", icon: CalendarClock },
    { key: "conversations", href: "/signals", icon: MessagesSquare },
  ],
  tools: [
    { key: "claimCheck", href: "/cek-klaim", icon: ShieldCheck },
    { key: "recon", href: "/recon", icon: UserSearch },
    { key: "visibility", href: "/visibility", icon: Sparkles },
  ],
  tasks: [
    { key: "alertsTab", href: "/alerts", icon: BellRing },
    { key: "actionCenter", href: "/action-plans", icon: ListChecks },
    { key: "cases", href: "/workspace/cases", icon: Briefcase },
  ],
  reports: [
    { key: "reportsTab", href: "/reports", icon: FileText },
    { key: "quality", href: "/quality", icon: BadgeCheck },
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
  // Pages that keep their menu's tabs without being a tab themselves (the Daily Brief opens from Analysis).
  if (pathname === "/brief") return "today";
  const entry = (Object.entries(SECTION_TABS) as Array<[SectionKey, ReadonlyArray<{ href: string }>]>).find(([, tabs]) => tabs.some((tab) => tab.href === pathname));
  return entry ? entry[0] : null;
}
