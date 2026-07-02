"use client";

import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  createCoordinates,
  type Coordinates,
  type GeographiesProps,
} from "@vnedyalk0v/react19-simple-maps";
import type { GlobalActivitySummary } from "@/lib/api-service";

const geoUrl = "/maps/world-110m.json";
type GeographyInput = GeographiesProps["geography"];

const countryNames: Record<string, string> = {
  "360": "Indonesia",
  "840": "United States",
  "392": "Japan",
  "826": "United Kingdom",
  "036": "Australia",
  "702": "Singapore",
  "124": "Canada",
  "250": "France",
  "276": "Germany",
  "380": "Italy",
  "578": "Norway",
  "752": "Sweden",
  "756": "Switzerland",
  "156": "China",
  "356": "India",
  "643": "Russia",
  "076": "Brazil",
  "710": "South Africa",
  "484": "Mexico",
  "764": "Thailand",
  "458": "Malaysia",
  "608": "Philippines",
  "704": "Vietnam",
  "410": "South Korea",
  "554": "New Zealand",
};

const mapCenter = createCoordinates(118, -2);

const levelStyles: Record<string, { color: string; label: string }> = {
  high: { color: "#EF4444", label: "High" },
  medium: { color: "#F79009", label: "Medium" },
  low: { color: "#12B76A", label: "Low" },
};

function getLevelStyle(level?: string) {
  return levelStyles[level || ""] || { color: "#465FFF", label: "Active" };
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function WorldActivityMap({
  activity,
  emptyLabel = "No mapped signal activity yet",
  mapErrorLabel = "World map could not be loaded",
  lowLabel = "Low",
  highLabel = "High",
}: {
  activity?: GlobalActivitySummary | null;
  emptyLabel?: string;
  mapErrorLabel?: string;
  lowLabel?: string;
  highLabel?: string;
}) {
  const [tooltipContent, setTooltipContent] = useState<ReactNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [geography, setGeography] = useState<GeographyInput | null>(null);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetch(geoUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load map data (${response.status})`);
        return response.json() as Promise<GeographyInput>;
      })
      .then((data) => {
        if (!isMounted) return;
        setGeography(data);
        setMapLoadFailed(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setMapLoadFailed(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const countriesById = useMemo(() => {
    return Object.fromEntries((activity?.countries || []).map((country) => [country.id, country]));
  }, [activity?.countries]);

  const markers = useMemo(() => {
    return (activity?.markers || [])
      .filter((marker) => Array.isArray(marker.coordinates) && marker.coordinates.length === 2)
      .map((marker) => ({
        ...marker,
        coordinates: createCoordinates(marker.coordinates[0], marker.coordinates[1]) as Coordinates,
      }));
  }, [activity?.markers]);

  const hasActivity = Boolean(activity?.total_signals && activity.total_signals > 0);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: Math.min(event.clientX - bounds.left + 15, bounds.width - 180),
      y: Math.max(event.clientY - bounds.top - 15, 12),
    });
  };

  const handleMouseLeave = () => {
    setTooltipContent(null);
    setTooltipPos(null);
  };

  return (
    <div
      className="relative h-[300px] w-full overflow-hidden rounded-[14px] border border-[#E7ECF5] bg-[radial-gradient(circle_at_30%_10%,#EEF4FF_0%,transparent_35%),linear-gradient(135deg,#FAFCFF_0%,#F7F9FE_100%)]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {mapLoadFailed ? (
        <div className="flex h-full items-center justify-center text-xs font-bold text-slate-400">
          {mapErrorLabel}
        </div>
      ) : geography ? (
        <ComposableMap
          projectionConfig={{ scale: 720, center: mapCenter }}
          width={640}
          height={280}
          style={{ width: "100%", height: "100%" }}
        >
          <Geographies geography={geography}>
            {({ geographies }) =>
              geographies.map((geo, index) => {
                const geoId = String(geo.id);
                const data = countriesById[geoId];
                const name = data?.name || countryNames[geoId] || (geo.properties as { name?: string }).name || "Unknown";
                const style = getLevelStyle(data?.level);

                return (
                  <Geography
                    key={`${geoId}-${index}`}
                    geography={geo}
                    onMouseEnter={() => {
                      setTooltipContent(
                        <div className="flex flex-col gap-1">
                          <span className="text-[13px] font-black text-[#101334]">{name}</span>
                          {data ? (
                            <>
                              <span className="text-xs font-black" style={{ color: style.color }}>
                                {data.signals.toLocaleString()} signals
                              </span>
                              <span className="text-[11px] font-semibold text-slate-500">
                                {style.label} activity · {formatTime(data.latest_at)}
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-400">{emptyLabel}</span>
                          )}
                        </div>
                      );
                    }}
                    onMouseLeave={() => setTooltipContent(null)}
                    style={{
                      default: {
                        fill: data ? style.color : "#E8EDF8",
                        fillOpacity: data ? 0.82 : 1,
                        stroke: "#FFFFFF",
                        strokeWidth: 0.6,
                        outline: "none",
                      },
                      hover: {
                        fill: data ? style.color : "#D1D9F0",
                        fillOpacity: 1,
                        stroke: "#FFFFFF",
                        strokeWidth: 0.7,
                        outline: "none",
                        cursor: "pointer",
                      },
                      pressed: {
                        fill: style.color,
                        stroke: "#FFFFFF",
                        strokeWidth: 0.7,
                        outline: "none",
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {markers.map((marker) => {
            const style = getLevelStyle(marker.level);
            return (
              <Marker key={`${marker.countryId}-${marker.name}`} coordinates={marker.coordinates}>
                <g
                  onMouseEnter={() => {
                    setTooltipContent(
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-black text-[#101334]">{marker.name}</span>
                        <span className="text-xs font-black" style={{ color: style.color }}>
                          {marker.signals.toLocaleString()} signals
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">{formatTime(marker.latest_at)}</span>
                      </div>
                    );
                  }}
                  onMouseLeave={() => setTooltipContent(null)}
                  style={{ cursor: "pointer" }}
                >
                  <circle cx={0} cy={0} r={10} fill={style.color} opacity={0.16}>
                    <animate attributeName="r" values="8;14;8" dur="2.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.24;0.06;0.24" dur="2.6s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={0} cy={0} r={4.2} fill={style.color} stroke="#FFFFFF" strokeWidth={1.5} />
                </g>
              </Marker>
            );
          })}
        </ComposableMap>
      ) : (
        <div className="h-full w-full animate-pulse bg-linear-to-br from-slate-50 via-white to-[#EEF2FF]" />
      )}

      {!hasActivity && geography && !mapLoadFailed ? (
        <div className="absolute inset-x-4 top-4 rounded-[12px] border border-dashed border-[#CBD5E1] bg-white/85 px-4 py-3 text-center text-[12px] font-bold text-slate-500 shadow-sm backdrop-blur">
          {emptyLabel}
        </div>
      ) : null}

      {tooltipContent && tooltipPos ? (
        <div
          className="pointer-events-none absolute z-30 rounded-[10px] border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-[0_12px_30px_rgba(15,23,42,0.10)] backdrop-blur-md"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          {tooltipContent}
        </div>
      ) : null}

      <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-full border border-slate-100 bg-white/90 px-3.5 py-2 text-xs font-black text-slate-600 shadow-sm">
        {lowLabel}
        <span className="h-2 w-20 rounded-full bg-gradient-to-r from-[#12B76A] via-[#F79009] to-[#EF4444]" />
        {highLabel}
      </div>

      {activity?.updated_at ? (
        <div className="absolute right-4 top-4 rounded-full border border-slate-100 bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm">
          Live · {formatTime(activity.updated_at)}
        </div>
      ) : null}
    </div>
  );
}
