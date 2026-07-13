"use client";

import {
  createContext,
  useContext,
  type ReactNode,
  type ReactElement,
} from "react";
import { useSSE, type SSEConnectionStatus, type UseSSEOptions } from "@/hooks/useSSE";

interface SSEResult {
  status: SSEConnectionStatus;
  isConnected: boolean;
  isConnecting: boolean;
  reconnect: () => void;
}

interface SSEContextValue extends SSEResult {
  /** Provider not mounted */
  isPending: boolean;
}

const SSEContext = createContext<SSEContextValue | null>(null);

interface SSERealtimeProviderProps {
  children: ReactNode;
  /** Options passed to useSSE hook */
  options?: UseSSEOptions;
}

/**
 * Provider that establishes a single SSE connection for the entire app.
 * Wrap your app or dashboard layout with this provider.
 *
 * @example
 * ```tsx
 * // In app layout
 * <SSERealtimeProvider>
 *   {children}
 * </SSERealtimeProvider>
 * ```
 *
 * To access SSE status in components:
 * ```tsx
 * const { status, isConnected } = useSSEContext();
 * ```
 */
export function SSERealtimeProvider({
  children,
  options = {},
}: SSERealtimeProviderProps): ReactElement {
  const { status, isConnected, isConnecting, reconnect } = useSSE({
    ...options,
    // Default to auto-connect
    autoConnect: options.autoConnect ?? true,
  });

  const value: SSEContextValue = {
    status,
    isConnected,
    isConnecting,
    reconnect,
    isPending: false,
  };

  return (
    <SSEContext.Provider value={value}>
      {children}
    </SSEContext.Provider>
  );
}

/**
 * Hook to access SSE connection status from any component.
 * Must be used within SSERealtimeProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { status, isConnected } = useSSEContext();
 *   return <div>{isConnected ? "Live" : "Offline"}</div>;
 * }
 * ```
 */
export function useSSEContext(): SSEContextValue {
  const context = useContext(SSEContext);

  if (context === null) {
    // Return a default disconnected state if not wrapped
    // This prevents errors during development if someone forgets the provider
    console.warn(
      "[SSERealtimeProvider] useSSEContext used outside of provider. " +
        "Wrap your app with SSERealtimeProvider or use useSSE directly."
    );
    return {
      status: "disconnected",
      isConnected: false,
      isConnecting: false,
      reconnect: () => {},
      isPending: false,
    };
  }

  return context;
}
