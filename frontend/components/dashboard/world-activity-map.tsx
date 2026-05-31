"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";

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
  { name: "Surabaya", coordinates: [112.7521, -7.2575], signals: 928, color: "#465FFF" },
  { name: "Medan", coordinates: [98.6722, 3.5952], signals: 618, color: "#8B5CFF" },
  { name: "Makassar", coordinates: [119.4173, -5.1476], signals: 412, color: "#12B76A" },
  { name: "Bandung", coordinates: [107.6191, -6.9175], signals: 754, color: "#38A7FF" },
  { name: "Yogyakarta", coordinates: [110.3695, -7.7956], signals: 485, color: "#F79009" },
];

export function WorldActivityMap() {
  const [tooltipContent, setTooltipContent] = useState<ReactNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: event.clientX - bounds.left + 15,
      y: event.clientY - bounds.top - 15,
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
        projectionConfig={{ scale: 720, center: [118, -2] }}
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
                        <span className="text-[13px] font-bold text-[#111536]">{name}</span>
                        {hasData ? (
                          <>
                            <span className="text-xs font-bold text-[#351EFF]">Signals: {hasData.signals.toLocaleString()}</span>
                            <span className="text-[11px] text-slate-500">
                              Level Aktivitas:{" "}
                              <b className={hasData.level === "Tinggi" ? "text-[#F04438]" : "text-[#8B5CFF]"}>
                                {hasData.level}
                              </b>
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400">Tidak ada aktivitas narrative</span>
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
                    <span className="text-[13px] font-bold text-[#111536]">{name}</span>
                    <span className="text-xs font-bold text-[#351EFF]">Signals: {signals.toLocaleString()}</span>
                    <span className="text-[11px] text-slate-500">Lokasi Pemantauan Aktif</span>
                  </div>
                );
              }}
              onMouseLeave={() => setTooltipContent(null)}
              style={{ cursor: "pointer" }}
            >
              <circle cx={0} cy={0} r={7} fill={color} opacity={0.25} />
              <circle cx={0} cy={0} r={4} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
            </g>
          </Marker>
        ))}
      </ComposableMap>

      {tooltipContent && tooltipPos ? (
        <div
          className="pointer-events-none absolute z-30 rounded-[8px] border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.08)] backdrop-blur-md"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          {tooltipContent}
        </div>
      ) : null}

      <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-full border border-slate-100 bg-white/90 px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm">
        Rendah
        <span className="h-2 w-20 rounded-full bg-gradient-to-r from-[#E2E8F0] via-[#8B5CFF] to-[#351EFF]" />
        Tinggi
      </div>

      <div className="absolute right-4 top-1/2 grid -translate-y-1/2 gap-1.5">
        {["+", "-", "reset"].map((item) => (
          <button
            key={item}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
            type="button"
          >
            {item === "reset" ? "R" : item}
          </button>
        ))}
      </div>
    </div>
  );
}
