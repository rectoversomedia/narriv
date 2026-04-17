"use client";

import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export const Topbar = () => {
    const router = useRouter();
    const [user, setUser] = useState<{name: string, email: string} | null>(null);

    useEffect(() => {
        const fetchMe = async () => {
            const token = localStorage.getItem("token");
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
        fetchMe();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        router.push("/login");
    };

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
