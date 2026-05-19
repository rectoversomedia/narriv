"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface DonutChartProps {
  title: string;
  data: { name: string; value: number }[];
  colors?: string[];
}

const DEFAULT_COLORS = ["#465FFF", "#8B5CFF", "#10B981", "#F59E0B", "#EF4444", "#64748B"];

export function DistributionChart({ title, data, colors = DEFAULT_COLORS }: DonutChartProps) {
  const activeData = data.filter(d => d.value > 0);

  return (
    <div className="cyber-card rounded-xl border border-slate-100 p-5 w-full h-[350px] flex flex-col justify-between">
      <h3 className="text-slate-900 font-bold tracking-tight mb-2">{title}</h3>
      <div className="flex-1 w-full relative">
        {activeData.length === 0 ? (
          <div className="text-slate-400 w-full h-full flex items-center justify-center text-sm">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={activeData}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {activeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: "#0C0F1D", borderColor: "rgba(255, 255, 255, 0.08)", borderRadius: "8px", color: "#ffffff" }}
                itemStyle={{ color: "#ffffff" }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                formatter={(value) => <span className="text-slate-500 text-xs">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
