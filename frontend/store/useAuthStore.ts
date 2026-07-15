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
  initDemoSession: (user: AuthUser, accessToken: string, refreshToken?: string) => void;
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
      // SECURITY FIX: initDemoSession now requires server-provided tokens
      // Demo sessions must be validated server-side
      initDemoSession: (user, accessToken, refreshToken) => {
        setAuthCookie(true);
        set({
          token: accessToken,
          refreshToken: refreshToken || null,
          user,
          isAuthenticated: true
        });
      },
    }),
    {
      name: "narriv-auth",
    }
  )
);

// Initialize demo session listener - now receives server-validated tokens
if (typeof window !== "undefined") {
  window.addEventListener("narriv_demo_login", ((event: CustomEvent) => {
    const { user, accessToken, refreshToken } = event.detail as {
      user: AuthUser;
      accessToken: string;
      refreshToken?: string;
    };
    useAuthStore.getState().initDemoSession(user, accessToken, refreshToken);
  }) as EventListener);
}
