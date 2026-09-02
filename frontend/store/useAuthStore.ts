import { create } from "zustand";
import { persist } from "zustand/middleware";

// Extend Window to track demo listener registration
declare global {
  interface Window {
    _narrivDemoListenerRegistered?: boolean;
  }
}

const AUTH_COOKIE_NAME = "narriv-authenticated";
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function setAuthCookie(isAuthenticated: boolean) {
  if (typeof document === "undefined") return;

  document.cookie = isAuthenticated
    ? `${AUTH_COOKIE_NAME}=true; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax`
    : `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

// Clean up stale fake demo tokens from legacy code (client-generated, not real JWTs)
function invalidateStaleDemoSession() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("narriv-auth");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const token = parsed?.state?.token || parsed?.token;
    if (typeof token === "string" && token.startsWith("demo-")) {
      localStorage.removeItem("narriv-auth");
    }
  } catch {
    // ignore
  }
}
invalidateStaleDemoSession();

export type AuthUser = {
  name: string;
  email: string;
  provider: "password" | "google" | "demo";
  workspace: string;
  workspaceId?: string;
  isDemo?: boolean;
};

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setToken: (token: string | null) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  setSession: (token: string, user: AuthUser, refreshToken?: string | null) => void;
  logout: () => void;
  initDemoSession: (user: AuthUser, accessToken: string, refreshToken?: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setToken: (token) => {
        setAuthCookie(!!token);
        set({ token, isAuthenticated: !!token });
      },
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      setUser: (user) => set({ user }),
      setSession: (token, user, refreshToken = null) => {
        setAuthCookie(true);
        set({ token, refreshToken, user, isAuthenticated: true });
      },
      logout: () => {
        setAuthCookie(false);
        set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
      },
      initDemoSession: (user, accessToken, refreshToken) => {
        setAuthCookie(true);
        set({ token: accessToken, refreshToken: refreshToken || null, user, isAuthenticated: true });
      },
    }),
    {
      name: "narriv-auth",
    }
  )
);

// Initialize demo session listener (guard against duplicate registration in React 18 Strict Mode)
if (typeof window !== "undefined" && !window._narrivDemoListenerRegistered) {
  window._narrivDemoListenerRegistered = true;
  window.addEventListener("narriv_demo_login", ((event: CustomEvent) => {
    const { user, accessToken, refreshToken } = event.detail as {
      user: AuthUser;
      accessToken: string;
      refreshToken?: string;
    };
    useAuthStore.getState().initDemoSession(user, accessToken, refreshToken);
  }) as EventListener);
}

// Restore demo session from localStorage on page load
if (typeof window !== "undefined") {
  const demoUser = localStorage.getItem("narriv_demo_user");
  const demoToken = localStorage.getItem("narriv_demo_token");
  const demoRefreshToken = localStorage.getItem("narriv_demo_refresh_token");
  if (demoUser && demoToken && demoRefreshToken && !useAuthStore.getState().isAuthenticated) {
    try {
      const user = JSON.parse(demoUser) as AuthUser;
      useAuthStore.getState().initDemoSession(user, demoToken, demoRefreshToken);
    } catch {
      // Invalid demo data, ignore
    }
  }
}
