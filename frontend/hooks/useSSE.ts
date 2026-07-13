"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SSERealtimeClient, type SSEStreamOptions } from "@/lib/api-service";
import { useToast } from "@/components/ui/toast";

export type SSEConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export interface SSEMessage {
  event: string;
  data: unknown;
  timestamp: Date;
}

// Signal event types
interface SignalCreatedData {
  id: string;
  title?: string;
  platform?: string;
  sentiment?: string;
  content?: string;
}

interface SignalAnalyzedData {
  id: string;
  sentiment?: string;
  confidenceScore?: number;
}

interface SignalUpdatedData {
  id: string;
  changes?: Record<string, unknown>;
}

// Alert event types
interface AlertCreatedData {
  id: string;
  title: string;
  severity?: string;
  type?: string;
}

interface AlertUpdatedData {
  id: string;
  changes?: Record<string, unknown>;
}

interface AlertStatusChangedData {
  id: string;
  previousStatus: string;
  newStatus: string;
}

interface AlertEscalatedData {
  id: string;
  escalationLevel: string;
  previousLevel?: string;
}

// Notification event types
interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}

export interface UseSSEOptions {
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
  /** Enable verbose logging (default: false in production) */
  debug?: boolean;
  /** Called when connection status changes */
  onStatusChange?: (status: SSEConnectionStatus) => void;
  /** Called on each message */
  onMessage?: (event: string, data: unknown) => void;
  /** Called on dashboard_refresh events */
  onDashboardRefresh?: () => void;
  /** Called on dashboard_update events */
  onDashboardUpdate?: (data: unknown) => void;
  /** Called on signal.created events */
  onSignalCreated?: (data: SignalCreatedData) => void;
  /** Called on signal.analyzed events */
  onSignalAnalyzed?: (data: SignalAnalyzedData) => void;
  /** Called on signal.updated events */
  onSignalUpdated?: (data: SignalUpdatedData) => void;
  /** Called on alert.created events */
  onAlertCreated?: (data: AlertCreatedData) => void;
  /** Called on alert.updated events */
  onAlertUpdated?: (data: AlertUpdatedData) => void;
  /** Called on alert.status_changed events */
  onAlertStatusChanged?: (data: AlertStatusChangedData) => void;
  /** Called on alert.escalated events */
  onAlertEscalated?: (data: AlertEscalatedData) => void;
  /** Called on notification events */
  onNotification?: (data: NotificationData) => void;
}

const DEFAULT_RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 3;

/**
 * Hook for SSE real-time updates.
 *
 * Features:
 * - Auto-connects on mount
 * - Handles auto-reconnection
 * - Invalidates React Query caches on relevant events
 * - Shows toast notifications for important events
 * - Returns connection status for UI indicators
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { status, isConnected } = useSSE({
 *     onAlertCreated: (data) => {
 *       toast.info(`New alert: ${data.title}`);
 *     },
 *   });
 *
 *   return <div>{isConnected ? "Live" : "Offline"}</div>;
 * }
 * ```
 */
export function useSSE(options: UseSSEOptions = {}) {
  const {
    autoConnect = true,
    debug = process.env.NODE_ENV === "development",
    onStatusChange,
    onMessage,
    onDashboardRefresh,
    onDashboardUpdate,
    onSignalCreated,
    onSignalAnalyzed,
    onSignalUpdated,
    onAlertCreated,
    onAlertUpdated,
    onAlertStatusChanged,
    onAlertEscalated,
    onNotification,
  } = options;

  const queryClient = useQueryClient();
  const toast = useToast();
  const clientRef = useRef<SSERealtimeClient | null>(null);
  const [status, setStatus] = useState<SSEConnectionStatus>("disconnected");
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const log = useCallback((...args: unknown[]) => {
    if (debug) {
      console.log("[useSSE]", ...args);
    }
  }, [debug]);

  const updateStatus = useCallback((newStatus: SSEConnectionStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
    log("Status changed:", newStatus);
  }, [log, onStatusChange]);

  const handleMessage = useCallback((event: string, data: unknown) => {
    const message: SSEMessage = { event, data, timestamp: new Date() };
    setLastMessage(message);
    onMessage?.(event, data);

    // Event-specific handling
    switch (event) {
      case "dashboard_refresh":
        log("Dashboard refresh event");
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
        onDashboardRefresh?.();
        break;

      case "dashboard_update":
        log("Dashboard update event", data);
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
        onDashboardUpdate?.(data);
        break;

      case "signal.created":
        log("Signal created", data);
        queryClient.invalidateQueries({ queryKey: ["signals"] });
        queryClient.invalidateQueries({ queryKey: ["signalsMeta"] });
        onSignalCreated?.(data as SignalCreatedData);
        break;

      case "signal.analyzed":
        log("Signal analyzed", data);
        queryClient.invalidateQueries({ queryKey: ["signals"] });
        queryClient.invalidateQueries({ queryKey: ["signalsMeta"] });
        onSignalAnalyzed?.(data as SignalAnalyzedData);
        break;

      case "signal.updated":
        log("Signal updated", data);
        queryClient.invalidateQueries({ queryKey: ["signals"] });
        onSignalUpdated?.(data as SignalUpdatedData);
        break;

      case "alert.created":
        log("Alert created", data);
        queryClient.invalidateQueries({ queryKey: ["alerts"] });
        queryClient.invalidateQueries({ queryKey: ["alerts-summary"] });
        const alertData = data as AlertCreatedData;
        toast.info(alertData.title, "New Alert Created");
        onAlertCreated?.(alertData);
        break;

      case "alert.updated":
        log("Alert updated", data);
        queryClient.invalidateQueries({ queryKey: ["alerts"] });
        queryClient.invalidateQueries({ queryKey: ["alerts-summary"] });
        onAlertUpdated?.(data as AlertUpdatedData);
        break;

      case "alert.status_changed":
        log("Alert status changed", data);
        queryClient.invalidateQueries({ queryKey: ["alerts"] });
        queryClient.invalidateQueries({ queryKey: ["alerts-summary"] });
        const statusData = data as AlertStatusChangedData;
        toast.info(`Alert status changed to ${statusData.newStatus}`, "Alert Updated");
        onAlertStatusChanged?.(statusData);
        break;

      case "alert.escalated":
        log("Alert escalated", data);
        queryClient.invalidateQueries({ queryKey: ["alerts"] });
        queryClient.invalidateQueries({ queryKey: ["alerts-summary"] });
        const escalatedData = data as AlertEscalatedData;
        toast.error(`Alert escalated to ${escalatedData.escalationLevel}`, "Alert Escalated");
        onAlertEscalated?.(escalatedData);
        break;

      case "notification":
        log("Notification", data);
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        const notifData = data as NotificationData;
        toast.info(notifData.message, notifData.title);
        onNotification?.(notifData);
        break;

      case "action_plan.created":
        log("Action plan created", data);
        queryClient.invalidateQueries({ queryKey: ["action-plans"] });
        break;

      case "action_plan.updated":
        log("Action plan updated", data);
        queryClient.invalidateQueries({ queryKey: ["action-plans"] });
        break;

      case "report.generated":
        log("Report generated", data);
        queryClient.invalidateQueries({ queryKey: ["reports"] });
        toast.success("New report is ready", "Report Generated");
        break;

      case "report.exported":
        log("Report exported", data);
        toast.success("Report export completed", "Report Exported");
        break;

      default:
        log("Unknown event:", event, data);
    }
  }, [
    log,
    queryClient,
    toast,
    onMessage,
    onDashboardRefresh,
    onDashboardUpdate,
    onSignalCreated,
    onSignalAnalyzed,
    onSignalUpdated,
    onAlertCreated,
    onAlertUpdated,
    onAlertStatusChanged,
    onAlertEscalated,
    onNotification,
  ]);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return; // SSR guard

    // Clean up existing connection
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }

    updateStatus("connecting");
    log("Connecting...");

    const sseOptions: SSEStreamOptions = {
      onConnected: () => {
        reconnectAttemptsRef.current = 0;
        updateStatus("connected");
        log("Connected");
      },
      onError: (error) => {
        log("Error:", error.message);
        updateStatus("error");

        // Auto-reconnect logic
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          const delay = DEFAULT_RECONNECT_DELAY * reconnectAttemptsRef.current;
          log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
          updateStatus("connecting");
          setTimeout(() => connect(), delay);
        } else {
          log("Max reconnection attempts reached");
          updateStatus("error");
        }
      },
      onDisconnect: () => {
        log("Disconnected");
        updateStatus("disconnected");
      },
      onMessage: handleMessage,
    };

    clientRef.current = new SSERealtimeClient(sseOptions);
    clientRef.current.connect();
  }, [log, updateStatus, handleMessage]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
      reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS; // Prevent auto-reconnect
      updateStatus("disconnected");
      log("Disconnected manually");
    }
  }, [log, updateStatus]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, [autoConnect, connect]);

  return {
    /** Current connection status */
    status,
    /** Whether the connection is active */
    isConnected: status === "connected",
    /** Whether the connection is in a transient state */
    isConnecting: status === "connecting",
    /** The last received message */
    lastMessage,
    /** Connect to the SSE stream */
    connect,
    /** Disconnect from the SSE stream */
    disconnect,
    /** Force a reconnection */
    reconnect: connect,
  };
}
