import React from "react";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
}

export function KpiCard({ title, value, subtitle, icon: Icon, iconColor = "text-[#5A6478]" }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 flex flex-col justify-between transition-all duration-300 hover:border-slate-200 hover:shadow-sm">
      <div className="flex justify-between items-center">
        <h3 className="text-[#5A6478] font-medium text-sm">{title}</h3>
        </div>
      <div>
        <p className="text-slate-900 text-3xl font-extrabold tracking-tight mb-1">{value}</p>
        {subtitle && <p className="text-[#5A6478] text-xs">{subtitle}</p>}
      </div>
    </div>
  );
}
