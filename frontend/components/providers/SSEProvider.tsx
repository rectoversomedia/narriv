"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
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
  // Force re-evaluation of SSE auth when demo session initializes.
  // DemoButton uses window.location.href (full page reload), so on reload:
  // Zustand rehydrates user=null → connect() runs → isDemoMode()=false → SSE 401.
  // Then narriv_demo_login fires → we increment this counter → useSSE re-runs
  // with correct isDemoMode()=true.
  const [authVersion, setAuthVersion] = useState(0);
  useEffect(() => {
    const handler = () => setAuthVersion((v) => v + 1);
    window.addEventListener("narriv_demo_login", handler);
    return () => window.removeEventListener("narriv_demo_login", handler);
  }, []);

  const { status, isConnected, isConnecting, reconnect } = useSSE({
    ...options,
    autoConnect: options.autoConnect ?? true,
    // Bump key when auth changes so useSSE re-runs with fresh auth state
    authVersion,
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
