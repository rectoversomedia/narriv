"use client";

import React, { useState } from "react";
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
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";


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
    <div className="h-[214px] w-full">
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
          <Area type="monotone" dataKey="value" stroke="#351EFF" strokeWidth={3} fill="url(#activityFill)" dot={activityDot} activeDot={activityActiveDot} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AiMentionsLineChart({ data }: { data: SeriesPoint[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={aiMentionsMargin}>
          <CartesianGrid stroke="#E6EAF4" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={chartTick} />
          <YAxis axisLine={false} tickLine={false} tick={chartTick} />
          <Tooltip contentStyle={tooltipContentStyle} />
          <Line type="monotone" dataKey="value" name="Brand Anda" stroke="#351EFF" strokeWidth={3} dot={brandDot} />
          <Line type="monotone" dataKey="competitor" name="Kompetitor 1" stroke="#38A7FF" strokeWidth={2} strokeDasharray="5 4" dot={competitorDot} />
          <Line type="monotone" dataKey="secondary" name="Kompetitor 2" stroke="#12B76A" strokeWidth={2} strokeDasharray="5 4" dot={secondaryDot} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({ data, center, label }: { data: Array<{ name: string; value: number; tone: Tone }>; center: string; label: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="relative mx-auto h-[188px] w-[188px]">
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
    <div className="space-y-4">
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
    <div className="h-7 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={values.map((value, index) => ({ index, value }))} margin={{ left: 0, right: 0, top: 3, bottom: 3 }}>
          <Line type="monotone" dataKey="value" stroke={toneColor[tone]} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TinyBarChart({ data }: { data: Array<{ name: string; value: number; tone: Tone }> }) {
  return (
    <div className="h-[94px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <Bar dataKey="value" radius={[7, 7, 0, 0]}>
            {data.map((entry) => <Cell key={entry.name} fill={toneColor[entry.tone]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const geoUrl = "/maps/world-110m.json";

const countryData: Record<string, { name: string; signals: number; level: string; color: string }> = {
  "360": { name: "Indonesia", signals: 1842, level: "Tinggi", color: "#351EFF" },
  "840": { name: "Amerika Serikat", signals: 1425, level: "Tinggi", color: "#465FFF" },
  "392": { name: "Jepang", signals: 928, level: "Sedang", color: "#8B5CFF" },
  "826": { name: "Britania Raya", signals: 754, level: "Sedang", color: "#38A7FF" },
  "036": { name: "Australia", signals: 618, level: "Sedang", color: "#8B5CFF" },
  "702": { name: "Singapura", signals: 412, level: "Rendah", color: "#12B76A" },
};

const countryNames: Record<string, string> = {
  "360": "Indonesia",
  "840": "Amerika Serikat",
  "392": "Jepang",
  "826": "Britania Raya",
  "036": "Australia",
  "702": "Singapura",
  "124": "Kanada",
  "250": "Prancis",
  "276": "Jerman",
  "380": "Italia",
  "578": "Norwegia",
  "752": "Swedia",
  "756": "Swiss",
  "156": "Tiongkok",
  "356": "India",
  "643": "Rusia",
  "076": "Brasil",
  "710": "Afrika Selatan",
  "484": "Meksiko",
  "764": "Thailand",
  "458": "Malaysia",
  "608": "Filipina",
  "704": "Vietnam",
  "410": "Korea Selatan",
  "554": "Selandia Baru",
};

const markers: Array<{ name: string; coordinates: [number, number]; signals: number; color: string }> = [
  { name: "Jakarta", coordinates: [106.8456, -6.2088], signals: 1842, color: "#351EFF" },
  { name: "New York", coordinates: [-74.0060, 40.7128], signals: 1425, color: "#465FFF" },
  { name: "London", coordinates: [-0.1278, 51.5074], signals: 754, color: "#38A7FF" },
  { name: "Tokyo", coordinates: [139.6503, 35.6762], signals: 928, color: "#8B5CFF" },
  { name: "Singapore", coordinates: [103.8198, 1.3521], signals: 412, color: "#12B76A" },
  { name: "Sydney", coordinates: [151.2093, -33.8688], signals: 618, color: "#8B5CFF" },
];

export function WorldActivityMap() {
  const [tooltipContent, setTooltipContent] = useState<React.ReactNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - bounds.left + 15,
      y: e.clientY - bounds.top - 15,
    });
  };

  const handleMouseLeave = () => {
    setTooltipContent(null);
    setTooltipPos(null);
  };

  return (
    <div
      className="relative h-[300px] w-full overflow-hidden rounded-[10px] border border-slate-100 bg-[#FBFCFF]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <ComposableMap
        projectionConfig={{ scale: 140, center: [0, 10] }}
        width={640}
        height={280}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const geoId = String(geo.id);
              const hasData = countryData[geoId];
              const name = countryNames[geoId] || (geo.properties as { name?: string }).name || "Unknown";

              const fill = hasData ? hasData.color : "#E8EDF8";

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={() => {
                    setTooltipContent(
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-[#111536] text-[13px]">{name}</span>
                        {hasData ? (
                          <>
                            <span className="text-[#351EFF] text-xs font-bold">Signals: {hasData.signals.toLocaleString()}</span>
                            <span className="text-slate-500 text-[11px]">
                              Level Aktivitas:{" "}
                              <b className={hasData.level === "Tinggi" ? "text-[#F04438]" : "text-[#8B5CFF]"}>
                                {hasData.level}
                              </b>
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Tidak ada aktivitas narrative</span>
                        )}
                      </div>
                    );
                  }}
                  onMouseLeave={() => setTooltipContent(null)}
                  style={{
                    default: {
                      fill,
                      stroke: "#FFFFFF",
                      strokeWidth: 0.6,
                      outline: "none",
                    },
                    hover: {
                      fill: hasData ? "#2F20FF" : "#D1D9F0",
                      stroke: "#FFFFFF",
                      strokeWidth: 0.6,
                      outline: "none",
                      cursor: "pointer",
                    },
                    pressed: {
                      fill: "#2F20FF",
                      stroke: "#FFFFFF",
                      strokeWidth: 0.6,
                      outline: "none",
                    },
                  }}
                />
              );
            })
          }
        </Geographies>

        {markers.map(({ name, coordinates, signals, color }) => (
          <Marker key={name} coordinates={coordinates}>
            <g
              onMouseEnter={() => {
                setTooltipContent(
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-[#111536] text-[13px]">{name}</span>
                    <span className="text-[#351EFF] text-xs font-bold">Signals: {signals.toLocaleString()}</span>
                    <span className="text-slate-500 text-[11px]">Lokasi Pemantauan Aktif</span>
                  </div>
                );
              }}
              onMouseLeave={() => setTooltipContent(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Ping ring */}
              <circle cx={0} cy={0} r={7} fill={color} opacity={0.25} />
              {/* Solid dot */}
              <circle cx={0} cy={0} r={4} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
            </g>
          </Marker>
        ))}
      </ComposableMap>

      {/* Floating cursor tooltip */}
      {tooltipContent && tooltipPos && (
        <div
          className="absolute pointer-events-none rounded-[8px] border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.08)] backdrop-blur-md z-30"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          {tooltipContent}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-full bg-white/90 border border-slate-100 px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm">
        Rendah
        <span className="h-2 w-20 rounded-full bg-gradient-to-r from-[#E2E8F0] via-[#8B5CFF] to-[#351EFF]" />
        Tinggi
      </div>

      {/* Controls */}
      <div className="absolute right-4 top-1/2 grid -translate-y-1/2 gap-1.5">
        {["+", "−", "⟳"].map((item) => (
          <button
            key={item}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
