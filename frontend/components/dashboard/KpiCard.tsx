import React from "react";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
}

export function KpiCard({ title, value, subtitle, icon: Icon, iconColor = "text-zinc-400" }: KpiCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-zinc-400 font-medium text-sm">{title}</h3>
        <Icon className={`${iconColor} w-4 h-4`} />
      </div>
      <div>
        <p className="text-3xl font-bold text-white mb-1">{value}</p>
        {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
      </div>
    </div>
  );
}
