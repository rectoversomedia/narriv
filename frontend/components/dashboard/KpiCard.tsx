import React from "react";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
}

export function KpiCard({ title, value, subtitle, icon: Icon, iconColor = "theme-muted" }: KpiCardProps) {
  return (
    <div className="theme-card rounded-xl border p-5 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-center mb-4">
        <h3 className="theme-muted font-medium text-sm">{title}</h3>
        <Icon className={`${iconColor} w-4 h-4`} />
      </div>
      <div>
        <p className="theme-text text-3xl font-bold mb-1">{value}</p>
        {subtitle && <p className="theme-muted text-xs">{subtitle}</p>}
      </div>
    </div>
  );
}
