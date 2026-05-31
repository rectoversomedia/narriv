"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Tone } from "@/lib/mock-data";


const toneColor: Record<Tone, string> = {
  blue: "#465FFF",
  purple: "#351EFF",
  green: "#12B76A",
  red: "#F04438",
  amber: "#F79009",
  slate: "#667085",
};

const chartTick = { fill: "#53608C", fontSize: 11, fontWeight: 700 };
const tooltipContentStyle = { border: "1px solid #E1E6F2", borderRadius: 10, boxShadow: "0 18px 44px rgba(16,19,52,.12)" };
const activityMargin = { left: -18, right: 8, top: 12, bottom: 0 };
const aiMentionsMargin = { left: -16, right: 12, top: 16, bottom: 0 };
const activityCursor = { stroke: "#351EFF", strokeWidth: 1 };
const activityDot = { r: 3, fill: "#351EFF", stroke: "#fff", strokeWidth: 2 };
const activityActiveDot = { r: 5 };
const brandDot = { r: 4, fill: "#351EFF", stroke: "#fff", strokeWidth: 2 };
const competitorDot = { r: 3, fill: "#38A7FF", stroke: "#fff", strokeWidth: 2 };
const secondaryDot = { r: 3, fill: "#12B76A", stroke: "#fff", strokeWidth: 2 };

type SeriesPoint = {
  label: string;
  value: number;
  competitor?: number;
  secondary?: number;
};

export function ActivityAreaChart({ data }: { data: SeriesPoint[] }) {
  return (
    <div className="chart-enter h-[214px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={activityMargin}>
          <defs>
            <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#351EFF" stopOpacity={0.22} />
              <stop offset="85%" stopColor="#351EFF" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E6EAF4" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={chartTick} />
          <YAxis axisLine={false} tickLine={false} tick={chartTick} />
          <Tooltip cursor={activityCursor} contentStyle={tooltipContentStyle} />
          <Area type="monotone" dataKey="value" stroke="#351EFF" strokeWidth={3} fill="url(#activityFill)" dot={activityDot} activeDot={activityActiveDot} isAnimationActive animationDuration={900} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AiMentionsLineChart({ data }: { data: SeriesPoint[] }) {
  return (
    <div className="chart-enter h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={aiMentionsMargin}>
          <CartesianGrid stroke="#E6EAF4" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={chartTick} />
          <YAxis axisLine={false} tickLine={false} tick={chartTick} />
          <Tooltip contentStyle={tooltipContentStyle} />
          <Line type="monotone" dataKey="value" name="Brand Anda" stroke="#351EFF" strokeWidth={3} dot={brandDot} isAnimationActive animationDuration={900} />
          <Line type="monotone" dataKey="competitor" name="Kompetitor 1" stroke="#38A7FF" strokeWidth={2} strokeDasharray="5 4" dot={competitorDot} isAnimationActive animationDuration={900} />
          <Line type="monotone" dataKey="secondary" name="Kompetitor 2" stroke="#12B76A" strokeWidth={2} strokeDasharray="5 4" dot={secondaryDot} isAnimationActive animationDuration={900} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({ data, center, label }: { data: Array<{ name: string; value: number; tone: Tone }>; center: string; label: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="chart-donut-enter relative mx-auto h-[188px] w-[188px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={82}
            paddingAngle={2}
            stroke="#fff"
            strokeWidth={3}
            onMouseEnter={(entry) => setActiveIndex(Math.max(0, data.findIndex((item) => item.name === entry.name)))}
            onClick={(entry) => setActiveIndex(Math.max(0, data.findIndex((item) => item.name === entry.name)))}
            isAnimationActive
            animationDuration={720}
          >
            {data.map((entry, index) => <Cell key={entry.name} fill={toneColor[entry.tone]} opacity={index === activeIndex ? 1 : 0.82} className="cursor-pointer outline-none" />)}
          </Pie>
          <Tooltip contentStyle={tooltipContentStyle} position={{ x: 50, y: -10 }} wrapperStyle={{ zIndex: 20 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[27px] font-black tracking-[-0.04em] text-[#101334]">{center}</p>
        <p className="mt-1 text-[11px] font-bold text-[#53608C]">{label}</p>
      </div>
    </div>
  );
}

export function PlatformBarChart({ data }: { data: Array<{ name: string; value: number; percent: string; tone: Tone }> }) {
  const max = Math.max(...data.map((item) => item.value));
  return (
    <div className="chart-bar-enter space-y-4">
      {data.map((item) => (
        <div key={item.name} className="grid grid-cols-[150px_1fr_92px] items-center gap-4">
          <p className="text-sm font-bold text-[#101334]">{item.name}</p>
          <div className="h-2 overflow-hidden rounded-full bg-[#EEF1F7]">
            <div className="h-full rounded-full bg-[#351EFF]" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <p className="text-right text-sm font-bold text-[#34406C]">{item.value} <span className="text-xs text-[#53608C]">({item.percent})</span></p>
        </div>
      ))}
    </div>
  );
}

export function MiniSparkline({ tone = "purple" }: { tone?: Tone }) {
  const values = [8, 14, 10, 19, 13, 23, 15];
  return (
    <div className="chart-enter h-7 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={values.map((value, index) => ({ index, value }))} margin={{ left: 0, right: 0, top: 3, bottom: 3 }}>
          <Line type="monotone" dataKey="value" stroke={toneColor[tone]} strokeWidth={2} dot={false} isAnimationActive animationDuration={650} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TinyBarChart({ data }: { data: Array<{ name: string; value: number; tone: Tone }> }) {
  return (
    <div className="chart-enter h-[94px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <Bar dataKey="value" radius={[7, 7, 0, 0]} isAnimationActive animationDuration={700}>
            {data.map((entry) => <Cell key={entry.name} fill={toneColor[entry.tone]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
