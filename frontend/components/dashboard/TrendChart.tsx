"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface TrendData {
  date: string;
  count: number;
}

interface TrendChartProps {
  data: TrendData[];
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <div className="cyber-card rounded-xl border border-slate-100 p-5 w-full h-[350px] flex flex-col justify-between">
      <h3 className="text-slate-900 font-bold tracking-tight mb-4">Signal Volume Trends</h3>
      <div className="w-full h-[260px] flex-1">
        {data.length === 0 ? (
          <div className="text-slate-400 w-full h-full flex items-center justify-center text-sm">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="rgba(255, 255, 255, 0.4)" 
                fontSize={11} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="rgba(255, 255, 255, 0.4)" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: "#0C0F1D", borderColor: "rgba(255, 255, 255, 0.08)", borderRadius: "8px" }}
                itemStyle={{ color: "#ffffff" }}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' }}
              />
              <Line 
                name="Signal Count"
                type="monotone" 
                dataKey="count" 
                stroke="#465FFF" 
                strokeWidth={3}
                dot={{ r: 4, fill: "#465FFF", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#8B5CFF", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
