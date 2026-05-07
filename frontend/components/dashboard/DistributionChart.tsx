"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface DonutChartProps {
  title: string;
  data: { name: string; value: number }[];
  colors?: string[];
}

const DEFAULT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

export function DistributionChart({ title, data, colors = DEFAULT_COLORS }: DonutChartProps) {
  // Filter out zero values for better visualization
  const activeData = data.filter(d => d.value > 0);

  return (
    <div className="theme-card rounded-xl border p-5 shadow-sm w-full h-[350px] flex flex-col">
      <h3 className="theme-text font-semibold mb-2">{title}</h3>
      <div className="flex-1 w-full relative">
        {activeData.length === 0 ? (
          <div className="theme-muted w-full h-full flex items-center justify-center text-sm">
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
                contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", color: "#e4e4e7" }}
                itemStyle={{ color: "#e4e4e7" }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                formatter={(value) => <span className="theme-muted text-xs">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
