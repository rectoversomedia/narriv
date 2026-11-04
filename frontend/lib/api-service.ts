/**
 * Typed API layer for Narriv: fetchers for each domain, with mock data when the backend is unreachable in demo mode.
 * The code lives in lib/api/, one file per area; import from here so call sites stay stable.
 *
 * Usage:
 *   import { getDashboardSummary, getSignals, getAlerts } from "@/lib/api-service";
 */



export * from "./api/core";
export * from "./api/feeds";
export * from "./api/workspace";
export * from "./api/setup";
export * from "./api/operations";
export * from "./api/reports";
export * from "./api/insights";
export * from "./api/realtime";
export * from "./api/subscriptions";
