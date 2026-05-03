import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DemoUser } from "@/lib/demo-auth";

interface AuthState {
  token: string | null;
  user: DemoUser | null;
  isAuthenticated: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: DemoUser | null) => void;
  setSession: (token: string, user: DemoUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setToken: (token) => set({ token, isAuthenticated: !!token }),
      setUser: (user) => set({ user }),
      setSession: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: "narriv-demo-auth",
    }
  )
);
