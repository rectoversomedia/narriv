/** The server-sent events client. Re-exported from @/lib/api-service. */

import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/store/useAuthStore";

// ---------------------------------------------------------------------------
// Real-time SSE
// ---------------------------------------------------------------------------

export interface SSEStreamOptions {
  onMessage?: (event: string, data: unknown) => void;
  onConnected?: () => void;
  onError?: (error: Error) => void;
  onDisconnect?: () => void;
}

export class SSERealtimeClient {
  private eventSource: EventSource | null = null;
  private options: SSEStreamOptions;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(options: SSEStreamOptions) {
    this.options = options;
  }

  connect(): void {
    if (typeof window === "undefined") return; // SSR guard

    let token: string | null = null;
    if (typeof window !== "undefined") {
      try {
        token = useAuthStore.getState().token || null;
      } catch {
        token = null;
      }
    }
    if (!token) {
      const authState = localStorage.getItem("narriv-auth");
      if (authState) {
        try {
          const parsed = JSON.parse(authState);
          token = parsed?.state?.token || null;
        } catch {
          token = authState;
        }
      }
    }
    if (!token) {
      token = localStorage.getItem("narriv_demo_token") || null;
    }

    if (!token) {
      this.options.onError?.(new Error("No auth token found"));
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "https://narriv-api.vercel.app";
    // Pass token as query param — EventSource cannot send custom headers.
    // Vercel Edge strips HttpOnly cookies from cross-origin SSE requests,
    // so we read the JWT directly and send it as a query param.
    // The backend's verifyTokenSSE middleware accepts ?token=<jwt> for SSE endpoints only.
    const url = `${baseUrl}/api/realtime/stream?token=${encodeURIComponent(token)}`;

    try {
      // withCredentials: true sends same-origin cookies but Vercel Edge strips
      // cross-origin cookies for SSE. The token is in the URL query param instead.
      this.eventSource = new EventSource(url, { withCredentials: true });

      this.eventSource.addEventListener("connected", () => {
        this.reconnectAttempts = 0;
        this.options.onConnected?.();
      });

      this.eventSource.addEventListener("heartbeat", () => {
        // Heartbeat received
      });

      this.eventSource.addEventListener("dashboard_refresh", (e) => {
        this.options.onMessage?.("dashboard_refresh", JSON.parse(e.data));
      });

      this.eventSource.addEventListener("dashboard_update", (e) => {
        this.options.onMessage?.("dashboard_update", JSON.parse(e.data));
      });

      this.eventSource.addEventListener("signal.created", (e) => {
        this.options.onMessage?.("signal.created", JSON.parse(e.data));
      });

      this.eventSource.addEventListener("signal.analyzed", (e) => {
        this.options.onMessage?.("signal.analyzed", JSON.parse(e.data));
      });

      this.eventSource.addEventListener("signal.updated", (e) => {
        this.options.onMessage?.("signal.updated", JSON.parse(e.data));
      });

      this.eventSource.addEventListener("alert.created", (e) => {
        this.options.onMessage?.("alert.created", JSON.parse(e.data));
      });

      this.eventSource.addEventListener("alert.updated", (e) => {
        this.options.onMessage?.("alert.updated", JSON.parse(e.data));
      });

      this.eventSource.addEventListener("alert.status_changed", (e) => {
        this.options.onMessage?.("alert.status_changed", JSON.parse(e.data));
      });

      this.eventSource.addEventListener("alert.escalated", (e) => {
        this.options.onMessage?.("alert.escalated", JSON.parse(e.data));
      });

      this.eventSource.addEventListener("action_plan.created", (e) => {
        this.options.onMessage?.("action_plan.created", JSON.parse(e.data));
      });

      this.eventSource.addEventListener("action_plan.updated", (e) => {
        this.options.onMessage?.("action_plan.updated", JSON.parse(e.data));
      });

      this.eventSource.addEventListener("report.generated", (e) => {
        this.options.onMessage?.("report.generated", JSON.parse(e.data));
      });

      this.eventSource.addEventListener("report.exported", (e) => {
        this.options.onMessage?.("report.exported", JSON.parse(e.data));
      });

      this.eventSource.addEventListener("notification", (e) => {
        this.options.onMessage?.("notification", JSON.parse(e.data));
      });

      this.eventSource.addEventListener("timeout", () => {
        this.disconnect();
        this.options.onDisconnect?.();
      });

      this.eventSource.onerror = (error) => {
        console.error("SSE Error:", error);
        this.options.onError?.(new Error("SSE connection error"));

        // Auto-reconnect logic
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
        } else {
          this.options.onError?.(new Error("Max reconnection attempts reached"));
        }
      };
    } catch (error) {
      this.options.onError?.(error as Error);
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.options.onDisconnect?.();
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

export async function getRealtimeStatus(): Promise<{ connected: boolean; workspaceId: string; activeConnections: number; timestamp: number } | null> {
  try {
    return await apiClient("/api/realtime/status");
  } catch {
    return null;
  }
}
