import type { QueryClient } from "@tanstack/react-query";
import {
  getAlertsSummary,
  getEscalationMatrix,
  getReportSchedules,
  getReportTemplates,
  getReportsAnalytics,
  getSignalsMeta,
  getVisibilitySummary,
  getVisibilityTrends,
  getWorkspaceMembers,
} from "@/lib/api-service";
import { getExecutiveOverview, getTrend } from "@/lib/intelligence-api";

type Prefetch = { queryKey: readonly unknown[]; queryFn: () => Promise<unknown> };

// The slowest queries of each menu page, with the same keys and functions the pages use, so hovering or
// touching a menu item loads its data while the page itself is still on its way. Keep in step with the pages.
const ROUTE_QUERIES: Record<string, Prefetch[]> = {
  "/signals": [{ queryKey: ["signalsMeta"], queryFn: () => getSignalsMeta() }],
  "/alerts": [
    { queryKey: ["alerts-summary"], queryFn: async () => (await getAlertsSummary()) ?? null },
    { queryKey: ["workspace-members"], queryFn: () => getWorkspaceMembers() },
    { queryKey: ["escalation-matrix"], queryFn: () => getEscalationMatrix() },
  ],
  "/reports": [
    { queryKey: ["report-analytics"], queryFn: () => getReportsAnalytics() },
    { queryKey: ["report-templates"], queryFn: () => getReportTemplates() },
    { queryKey: ["report-schedules"], queryFn: () => getReportSchedules() },
  ],
  "/visibility": [
    { queryKey: ["visibility-summary"], queryFn: () => getVisibilitySummary() },
    { queryKey: ["visibility-trends", 30], queryFn: () => getVisibilityTrends(undefined, undefined, 30) },
  ],
  "/insights": [{ queryKey: ["insights", "trend", 24], queryFn: () => getTrend(24) }],
  "/action-center": [{ queryKey: ["executive-overview", 168], queryFn: () => getExecutiveOverview(168) }],
};

/** Starts loading a menu page's main data; data loaded in the last minute is reused, failures are ignored. */
export function prefetchRoute(queryClient: QueryClient, href: string) {
  for (const q of ROUTE_QUERIES[href] ?? []) {
    void queryClient.prefetchQuery({ queryKey: q.queryKey, queryFn: q.queryFn, staleTime: 60 * 1000 }).catch(() => {});
  }
}
