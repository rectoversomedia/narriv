"use client";

import { type SSEConnectionStatus } from "@/hooks/useSSE";

interface LiveIndicatorProps {
  status: SSEConnectionStatus;
  /** Show label (default: true) */
  showLabel?: boolean;
  /** Compact mode for inline use (default: false) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const statusConfig: Record<SSEConnectionStatus, {
  label: string;
  dotClass: string;
  pulseClass: string;
  textClass: string;
}> = {
  connecting: {
    label: "Connecting",
    dotClass: "bg-amber-500",
    pulseClass: "bg-amber-500",
    textClass: "text-amber-600",
  },
  connected: {
    label: "Live",
    dotClass: "bg-emerald-500",
    pulseClass: "bg-emerald-500",
    textClass: "text-emerald-600",
  },
  disconnected: {
    label: "Offline",
    dotClass: "bg-slate-400",
    pulseClass: "bg-slate-400",
    textClass: "text-slate-500",
  },
  error: {
    label: "Error",
    dotClass: "bg-red-500",
    pulseClass: "bg-red-500",
    textClass: "text-red-600",
  },
};

/**
 * Live connection status indicator for the topbar.
 *
 * Shows a pulsing dot with an optional label indicating SSE connection status.
 *
 * @example
 * ```tsx
 * // In Topbar or layout
 * <LiveIndicator status={sseStatus} />
 *
 * // Compact inline indicator
 * <LiveIndicator status={sseStatus} compact showLabel={false} />
 * ```
 */
export function LiveIndicator({
  status,
  showLabel = true,
  compact = false,
  className = "",
}: LiveIndicatorProps) {
  const config = statusConfig[status];

  if (compact) {
    return (
      <span
        className={`relative inline-flex h-2 w-2 ${className}`}
        title={config.label}
        role="status"
        aria-label={`Connection status: ${config.label}`}
      >
        {status === "connected" && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${config.pulseClass} opacity-75 animate-ping`}
          />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${config.dotClass}`}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors ${
        status === "connected"
          ? "bg-emerald-50 text-emerald-700"
          : status === "connecting"
            ? "bg-amber-50 text-amber-700"
            : "bg-slate-100 text-slate-500"
      } ${className}`}
      role="status"
      aria-label={`Connection status: ${config.label}`}
    >
      <span className="relative flex h-2 w-2">
        {status === "connected" && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${config.pulseClass} opacity-75 animate-ping`}
          />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${config.dotClass}`}
        />
      </span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
