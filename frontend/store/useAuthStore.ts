import { create } from "zustand";
import { persist } from "zustand/middleware";

const AUTH_COOKIE_NAME = "narriv-authenticated";
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function setAuthCookie(isAuthenticated: boolean) {
  if (typeof document === "undefined") return;

  document.cookie = isAuthenticated
    ? `${AUTH_COOKIE_NAME}=true; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax`
    : `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export type AuthUser = {
  name: string;
  email: string;
  provider: "password" | "google" | "demo";
  workspace: string;
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
  initDemoSession: (user: AuthUser) => void;
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
      initDemoSession: (user) => {
        const demoToken = "demo-token-" + Date.now();
        setAuthCookie(true);
        set({ token: demoToken, refreshToken: null, user, isAuthenticated: true });
      },
    }),
    {
      name: "narriv-auth",
    }
  )
);

// Initialize demo session listener
if (typeof window !== "undefined") {
  window.addEventListener("narriv_demo_login", ((event: CustomEvent) => {
    const user = event.detail as AuthUser;
    useAuthStore.getState().initDemoSession(user);
  }) as EventListener);
}

// Restore demo session from localStorage on page load
if (typeof window !== "undefined") {
  const demoUser = localStorage.getItem("narriv_demo_user");
  const demoToken = localStorage.getItem("narriv_demo_token");
  if (demoUser && demoToken && !useAuthStore.getState().isAuthenticated) {
    try {
      const user = JSON.parse(demoUser) as AuthUser;
      useAuthStore.getState().initDemoSession(user);
    } catch {
      // Invalid demo data, ignore
    }
  }
}
