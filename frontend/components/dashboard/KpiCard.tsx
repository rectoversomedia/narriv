import React from "react";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
}

export function KpiCard({ title, value, subtitle, icon: Icon, iconColor = "text-slate-500" }: KpiCardProps) {
  return (
    <div className="cyber-card rounded-xl border border-slate-100 p-5 flex flex-col justify-between transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-slate-400 font-medium text-sm">{title}</h3>
        <Icon className={`${iconColor} w-4 h-4`} />
      </div>
      <div>
        <p className="text-slate-900 text-3xl font-extrabold tracking-tight mb-1">{value}</p>
        {subtitle && <p className="text-slate-400 text-xs">{subtitle}</p>}
      </div>
    </div>
  );
}
