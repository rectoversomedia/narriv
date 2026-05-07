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

const DEFAULT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

export function PlatformBarChart({ title, data, colors = DEFAULT_COLORS }: PlatformBarChartProps) {
  // Filter out zero values
  const activeData = data.filter(d => d.value > 0);

  return (
    <div className="theme-card rounded-xl border p-5 shadow-sm w-full h-[350px] flex flex-col">
      <h3 className="theme-text font-semibold mb-4">{title}</h3>
      <div className="flex-1 w-full">
        {activeData.length === 0 ? (
          <div className="theme-muted w-full h-full flex items-center justify-center text-sm">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activeData} layout="vertical" margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis 
                type="number" 
                stroke="#52525b" 
                fontSize={12} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                stroke="#52525b" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                itemStyle={{ color: "#e4e4e7" }}
                cursor={{ fill: '#27272a', opacity: 0.4 }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
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
