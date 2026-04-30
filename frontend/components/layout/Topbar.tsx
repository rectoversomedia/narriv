"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";

export const Topbar = () => {
    const router = useRouter();
    const { token, user, setUser, logout } = useAuthStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const fetchMe = async () => {
            if (!token) return;

            try {
                const res = await fetch("http://localhost:3000/auth/me", {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                }
            } catch (error) {
                console.error("Failed to fetch user", error);
            }
        };
        // Only fetch if user is not already in the store, or just fetch anyway to refresh?
        if (token && !user) {
            fetchMe();
        }
    }, [token, user, setUser]);

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    if (!mounted) return null; // Avoid hydration mismatch


    return (
        <header className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 sticky top-0 z-10">
            <div className="flex items-center gap-4">
                <div className="text-zinc-400 text-sm hidden sm:block">
                    Narrative OS
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 mr-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-red-500 font-semibold border border-zinc-700">
                        {user?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="hidden sm:block text-sm">
                        <div className="text-zinc-200 font-medium leading-none">{user?.name || "Loading..."}</div>
                        <div className="text-zinc-500 text-xs mt-1">{user?.email || "..."}</div>
                    </div>
                </div>

                <button 
                  onClick={handleLogout}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Logout"
                >
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    );
};
