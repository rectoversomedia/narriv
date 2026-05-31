"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface PlatformData {
  name: string;
  value: number;
}

interface PlatformBarChartProps {
  title: string;
  data: PlatformData[];
  colors?: string[];
}

const DEFAULT_COLORS = ["#465FFF", "#8B5CFF", "#10B981", "#F59E0B", "#EF4444", "#64748B"];

export function PlatformBarChart({ title, data, colors = DEFAULT_COLORS }: PlatformBarChartProps) {
  const activeData = data.filter(d => d.value > 0);

  return (
    <div className="cyber-card rounded-xl border border-slate-100 p-5 w-full h-[350px] flex flex-col justify-between">
      <h3 className="text-slate-900 font-bold tracking-tight mb-4">{title}</h3>
      <div className="chart-enter flex-1 w-full">
        {activeData.length === 0 ? (
          <div className="text-slate-400 w-full h-full flex items-center justify-center text-sm">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activeData} layout="vertical" margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" horizontal={false} />
              <XAxis 
                type="number" 
                stroke="rgba(255, 255, 255, 0.4)" 
                fontSize={11} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                stroke="rgba(255, 255, 255, 0.4)" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: "#0C0F1D", borderColor: "rgba(255, 255, 255, 0.08)", borderRadius: "8px" }}
                itemStyle={{ color: "#ffffff" }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.03)', opacity: 0.4 }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive animationDuration={700}>
                {activeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
