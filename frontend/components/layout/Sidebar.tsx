"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Activity, 
  BrainCircuit, 
  BellRing, 
  Eye, 
  FileText, 
  Zap,
  Settings,
  Database
} from "lucide-react";

export const Sidebar = () => {
  const pathname = usePathname();

  const links = [
    { name: "Command Center", href: "/", icon: LayoutDashboard },
    { name: "Signals", href: "/signals", icon: Activity },
    { name: "Intelligence", href: "/intelligence", icon: BrainCircuit },
    { name: "Alerts", href: "/alerts", icon: BellRing },
    { name: "Visibility", href: "/visibility", icon: Eye },
    { name: "Reports", href: "/reports", icon: FileText },
    { name: "Action Plans", href: "/action-plans", icon: Zap },
  ];

  const workspaceLinks = [
    { name: "Data Sources", href: "/workspace/sources", icon: Database },
    { name: "Settings", href: "/workspace/settings", icon: Settings },
  ]

  return (
    <aside className="w-64 bg-zinc-950 text-white min-h-screen border-r border-zinc-800 flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Narriv</h1>
        <p className="text-xs text-zinc-400 mt-1 uppercase font-semibold tracking-wider">Narrative Intelligence</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4 mt-4 px-2">Core Engines</div>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive 
                  ? "bg-zinc-800/50 text-white font-medium" 
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/30"
              }`}
            >
              <Icon className={isActive ? "text-red-500" : "text-zinc-500"} size={18} />
              <span className="text-sm">{link.name}</span>
            </Link>
          );
        })}

        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4 mt-8 px-2">Workspace</div>
        {workspaceLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
             <Link
             key={link.name}
             href={link.href}
             className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
               isActive 
                 ? "bg-zinc-800/50 text-white font-medium" 
                 : "text-zinc-400 hover:text-white hover:bg-zinc-800/30"
             }`}
           >
             <Icon className={isActive ? "text-red-500" : "text-zinc-500"} size={18} />
             <span className="text-sm">{link.name}</span>
           </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800">
         <div className="bg-zinc-900 rounded-lg p-3 text-sm border border-zinc-800/50">
            <div className="font-semibold text-zinc-300">Phase 1 Build</div>
            <div className="text-zinc-500 text-xs mt-1">v0.1.0-alpha</div>
         </div>
      </div>
    </aside>
  );
};
