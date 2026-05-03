import {
  Activity,
  BellRing,
  BrainCircuit,
  Database,
  Eye,
  FileText,
  LayoutDashboard,
  Settings,
  Zap,
} from "lucide-react";

export const coreRoutes = [
  { key: "command", name: "Command Center", href: "/", icon: LayoutDashboard },
  { key: "signals", name: "Narrative Signals", href: "/signals", icon: Activity },
  { key: "intelligence", name: "Narrative Intelligence", href: "/intelligence", icon: BrainCircuit },
  { key: "alerts", name: "Predictive Alerts", href: "/alerts", icon: BellRing },
  { key: "visibility", name: "AI Visibility / GEO", href: "/visibility", icon: Eye },
  { key: "reports", name: "Reports", href: "/reports", icon: FileText },
  { key: "action", name: "Action Engine", href: "/action-plans", icon: Zap },
];

export const workspaceRoutes = [
  { key: "sources", name: "Data Sources", href: "/workspace/sources", icon: Database },
  { key: "settings", name: "Settings", href: "/workspace/settings", icon: Settings },
];

export const allRoutes = [...coreRoutes, ...workspaceRoutes];

export function getRouteName(pathname: string) {
  return allRoutes.find((route) => route.href === pathname)?.name ?? "Narriv";
}
