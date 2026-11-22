"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ComposableMap, Geographies, Geography, Marker, createCoordinates, type GeographiesProps } from "@vnedyalk0v/react19-simple-maps";
import { ArrowUpRight, ExternalLink, MapPin, Radio, Users, X } from "lucide-react";
import { getRegionBreakdown, getRegionDetail, type RegionBreakdown, type RegionPerson } from "@/lib/api-service";
import { PROVINCE_COORDS } from "@/lib/province-coords";
import { monitoringHref } from "@/lib/evidence-links";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";

/**
 * Peta Sebaran: where in Indonesia the brand is talked about, as signal points in Narriv's colors (blue → violet →
 * pink as the tone turns negative; size by volume; a pulse on the busiest). A point opens its province: tone, cities,
 * the strongest accounts and sources there (most records, then reach), the latest records, and a link to all of them.
 */
type Geo = GeographiesProps["geography"];
const DAYS = [7, 30, 90] as const;

const toneColor = (neg: number) => (neg >= 0.5 ? "#EC4899" : neg >= 0.3 ? "#8B5CF6" : "#465FFF");
const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} jt` : n >= 1e3 ? `${(n / 1e3).toFixed(1)} rb` : String(n));

function People({ title, icon: Icon, items, empty }: { title: string; icon: typeof Users; items: RegionPerson[]; empty: string }) {
  const L = useL();
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-[0.06em] text-[#5F6B94]"><Icon size={13} aria-hidden="true" />{title}</p>
      {items.length ? (
        <ol className="mt-2 grid gap-1.5">
          {items.map((p, i) => {
            const neg = p.total ? p.negative / p.total : 0;
            const inner = (
              <>
                <span className="w-4 shrink-0 text-[12px] font-black tabular-nums text-[#8A94B8]">{i + 1}</span>
                <PlatformIcon platform={p.platform} className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-[#101334]">{p.name}</span>
                <span className="shrink-0 text-[12px] font-bold tabular-nums text-[#4A5578]">{p.total} {L("posts", "post")}</span>
                {p.reach ? <span className="hidden shrink-0 text-[11.5px] font-semibold tabular-nums text-[#6B7591] sm:inline">· {fmt(p.reach)} {L("reach", "jangkauan")}</span> : null}
                <span className="size-2 shrink-0 rounded-full" style={{ background: toneColor(neg) }} title={`${Math.round(neg * 100)}% ${L("negative", "negatif")}`} />
              </>
            );
            return (
              <li key={`${p.platform}-${p.name}`}>
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-[10px] px-2 py-1.5 hover:bg-[#F4F6FC]">{inner}</a>
                ) : (
                  <Link href={monitoringHref({ q: p.name })} className="flex items-center gap-2 rounded-[10px] px-2 py-1.5 hover:bg-[#F4F6FC]">{inner}</Link>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-2 text-[12.5px] font-medium text-[#6B7591]">{empty}</p>
      )}
    </div>
  );
}

function ProvinceDetail({ code, days, onClose }: { code: string; days: 7 | 30 | 90; onClose: () => void }) {
  const L = useL();
  const q = useQuery({ queryKey: ["region-detail", code, days], queryFn: () => getRegionDetail(code, days), staleTime: 60 * 1000 });
  const d = q.data;
  const neg = d?.total ? Math.round((d.negative / d.total) * 100) : 0;
  const pos = d?.total ? Math.round((d.positive / d.total) * 100) : 0;
  return (
    <aside className="grid content-start gap-4 rounded-[16px] border-[1.5px] border-[#101334] bg-white p-4 shadow-[0_4px_0_#101334]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#5F6B94]"><MapPin size={13} aria-hidden="true" />{L(`Last ${days} days`, `${days} hari terakhir`)}</p>
          <h3 className="mt-0.5 text-[19px] font-black leading-tight text-[#101334]">{d?.name ?? "…"}</h3>
        </div>
        <button type="button" onClick={onClose} aria-label={L("Close", "Tutup")} className="grid size-8 place-items-center rounded-[9px] text-[#5F6B94] hover:bg-[#F1F4FA]"><X size={16} /></button>
      </div>
      {q.isLoading ? (
        <div className="grid gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full rounded-[10px]" />)}</div>
      ) : !d ? (
        <p className="text-[13px] font-medium text-[#6B7591]">{L("Could not load this region.", "Wilayah ini belum bisa dimuat.")}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-[12px] bg-[#F4F6FC] px-3 py-2"><p className="text-[18px] font-black tabular-nums text-[#101334]">{d.total}</p><p className="text-[11.5px] font-bold text-[#5F6B94]">{L("records", "catatan")}</p></div>
            <div className="rounded-[12px] bg-[#FDECEC] px-3 py-2"><p className="text-[18px] font-black tabular-nums text-[#B42318]">{neg}%</p><p className="text-[11.5px] font-bold text-[#B42318]">{L("negative", "negatif")}</p></div>
            <div className="rounded-[12px] bg-[#E8F7EF] px-3 py-2"><p className="text-[18px] font-black tabular-nums text-[#047857]">{pos}%</p><p className="text-[11.5px] font-bold text-[#047857]">{L("positive", "positif")}</p></div>
          </div>
          {d.cities.length ? (
            <div className="flex flex-wrap gap-1.5">{d.cities.map((c) => <span key={c.name} className="rounded-full bg-[#EEF1FF] px-2.5 py-1 text-[12px] font-bold text-[#3B52F5]">{c.name} · {c.total}</span>)}</div>
          ) : null}
          <People title={L("Strongest accounts", "Akun paling kuat")} icon={Users} items={d.accounts} empty={d.accountsHidden ? L("Account names are hidden in privacy mode.", "Nama akun disembunyikan (mode privasi).") : L("No social accounts in this region yet.", "Belum ada akun media sosial di wilayah ini.")} />
          <People title={L("Strongest sources", "Sumber paling kuat")} icon={Radio} items={d.sources} empty={L("No news sources in this region yet.", "Belum ada sumber berita di wilayah ini.")} />
          {d.records.length ? (
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.06em] text-[#5F6B94]">{L("Latest", "Terbaru")}</p>
              <ul className="mt-2 grid gap-1.5">
                {d.records.map((r) => (
                  <li key={r.id}>
                    <a href={r.url ?? monitoringHref({ region: code, q: r.title.slice(0, 60) })} target={r.url ? "_blank" : undefined} rel="noreferrer" className="flex items-start gap-2 rounded-[10px] px-2 py-1.5 hover:bg-[#F4F6FC]">
                      <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: r.sentiment === "negative" ? "#EC4899" : r.sentiment === "positive" ? "#12A66A" : "#8A94B8" }} />
                      <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-[#31406B]">{r.title}</span>
                      {r.url ? <ExternalLink size={12} className="mt-1 shrink-0 text-[#8A94B8]" aria-hidden="true" /> : null}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Link href={monitoringHref({ region: code })} className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-[#101334] bg-[#465FFF] px-3.5 text-[12.5px] font-bold text-white shadow-[0_2px_0_#101334] hover:bg-[#3B52F5]">
            {L(`All ${d.total} records in ${d.name}`, `Semua ${d.total} catatan di ${d.name}`)} <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </>
      )}
    </aside>
  );
}

export function IndonesiaSignalMap({ className, hideTitle = false }: { className?: string; hideTitle?: boolean }) {
  const L = useL();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [sel, setSel] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  useEffect(() => { fetch("/maps/world-110m.json").then((r) => r.json()).then(setGeo).catch(() => setGeo(null)); }, []);
  const q = useQuery({ queryKey: ["signal-regions", days], queryFn: () => getRegionBreakdown(days), staleTime: 60 * 1000 });
  const provinces = useMemo(() => (q.data?.provinces ?? []).filter((p) => PROVINCE_COORDS[p.code]), [q.data]);
  const max = Math.max(1, ...provinces.map((p) => p.total));
  const busiest = provinces[0]?.code;
  // Zoom: provinces too close to tell apart (Jakarta, Banten, Jawa Barat) form one group; opening it zooms in.
  const BASE = { scale: 1000, center: [118.2, -2.6] as [number, number] };
  const [view, setView] = useState(BASE);
  const zoomed = view.scale !== BASE.scale;
  const groups = useMemo(() => {
    const degPerPx = 180 / (Math.PI * view.scale);
    const near = 26 * degPerPx;
    const out: Array<{ items: typeof provinces; lng: number; lat: number }> = [];
    for (const p of provinces) {
      const [lng, lat] = PROVINCE_COORDS[p.code];
      const g = out.find((c) => Math.hypot(c.lng - lng, c.lat - lat) < near);
      if (g) { g.items.push(p); g.lng = g.items.reduce((n, x) => n + PROVINCE_COORDS[x.code][0], 0) / g.items.length; g.lat = g.items.reduce((n, x) => n + PROVINCE_COORDS[x.code][1], 0) / g.items.length; }
      else out.push({ items: [p], lng, lat });
    }
    return out;
  }, [provinces, view.scale]);
  const openGroup = (g: { lng: number; lat: number }) => setView({ scale: BASE.scale * 4, center: [g.lng, g.lat] });
  const hoverGroup = hover?.includes("-") ? provinces.filter((p) => hover.split("-").includes(p.code)) : null;
  const hovered = hoverGroup?.length ? { name: hoverGroup.map((p) => p.name).join(", "), total: hoverGroup.reduce((n, p) => n + p.total, 0), negative: hoverGroup.reduce((n, p) => n + p.negative, 0) } : provinces.find((p) => p.code === hover);

  return (
    <section className={cn(BOX, "grid gap-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          {hideTitle ? null : <h2 className="mb-1 text-[20px] font-black tracking-[-0.02em] text-[#101334]">{L("Signal Map", "Peta Sebaran")}</h2>}
          <p className=" text-[13px] font-medium leading-relaxed text-[#5F6B94]">{L("Where in Indonesia the conversation is about. Bigger points carry more records; pink means mostly negative. Open a point to see the strongest accounts and sources there.", "Di mana saja di Indonesia percakapan terjadi. Titik makin besar, makin banyak catatan; makin merah muda, makin negatif. Buka titik untuk melihat akun dan sumber paling kuat di sana.")}</p>
        </div>
        <div className="inline-flex rounded-[10px] bg-[#F1F4FA] p-0.5">
          {DAYS.map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} aria-pressed={days === d} className={cn("h-8 rounded-[8px] px-3 text-[12px] font-bold transition", days === d ? "bg-white text-[#101334] shadow-sm" : "text-[#5A6478] hover:text-[#101334]")}>{L(`${d} days`, `${d} hari`)}</button>
          ))}
        </div>
      </div>

      <div className={cn("grid items-start gap-4", sel && "lg:grid-cols-[minmax(0,1fr)_360px]")}>
        <div className="grid gap-3">
        <div className="relative overflow-hidden rounded-[16px] border border-[#E4E8F2] bg-[radial-gradient(circle_at_20%_10%,#EEF1FF_0%,transparent_45%),radial-gradient(circle_at_85%_90%,#FCE7F3_0%,transparent_45%),#FAFBFE]">
          {geo ? (
            <ComposableMap projection="geoMercator" projectionConfig={{ scale: view.scale, center: createCoordinates(view.center[0], view.center[1]) }} width={900} height={360} style={{ width: "100%", height: "auto" }}>
              <defs>
                <radialGradient id="nv-dot-blue"><stop offset="0%" stopColor="#8EA0FF" /><stop offset="100%" stopColor="#465FFF" /></radialGradient>
                <radialGradient id="nv-dot-violet"><stop offset="0%" stopColor="#C4B5FD" /><stop offset="100%" stopColor="#8B5CF6" /></radialGradient>
                <radialGradient id="nv-dot-pink"><stop offset="0%" stopColor="#F9A8D4" /><stop offset="100%" stopColor="#EC4899" /></radialGradient>
              </defs>
              <Geographies geography={geo}>
                {({ geographies }) => geographies.map((g, i) => {
                  const id = String(g.id);
                  const indo = id === "360";
                  return <Geography key={`${id}-${i}`} geography={g} style={{ default: { fill: indo ? "#DCE2F5" : "#EEF1F7", stroke: indo ? "#B8C2E6" : "#E2E6F0", strokeWidth: 0.6, outline: "none" }, hover: { fill: indo ? "#D2DAF2" : "#EEF1F7", outline: "none" }, pressed: { outline: "none" } }} />;
                })}
              </Geographies>
              {groups.map((g) => {
                if (g.items.length > 1) {
                  const total = g.items.reduce((n, x) => n + x.total, 0);
                  const negative = g.items.reduce((n, x) => n + x.negative, 0);
                  const neg = total ? negative / total : 0;
                  const r = 6 + Math.sqrt(total / max) * 12;
                  const key = g.items.map((x) => x.code).join("-");
                  const names = g.items.map((x) => x.name).join(", ");
                  return (
                    <Marker key={key} coordinates={createCoordinates(g.lng, g.lat)}>
                      <g role="button" tabIndex={0} aria-label={`${names}: ${total}`} style={{ cursor: "zoom-in" }} onClick={() => openGroup(g)} onKeyDown={(e) => { if (e.key === "Enter") openGroup(g); }} onMouseEnter={() => setHover(key)} onMouseLeave={() => setHover(null)}>
                        <circle r={r} fill={toneColor(neg)} opacity={0.35} className="nv-map-pulse" style={{ pointerEvents: "none" }} />
                        <circle r={r + 7} fill="none" stroke={toneColor(neg)} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.6} />
                        <circle r={r} fill={`url(#nv-dot-${neg >= 0.5 ? "pink" : neg >= 0.3 ? "violet" : "blue"})`} stroke="#FFFFFF" strokeWidth={2} />
                        <text textAnchor="middle" y={-1} style={{ fontSize: 10, fontWeight: 900, fill: "#FFFFFF", pointerEvents: "none" }}>{total}</text>
                        <text textAnchor="middle" y={9} style={{ fontSize: 6.5, fontWeight: 800, fill: "#FFFFFF", pointerEvents: "none" }}>{g.items.length} {L("prov.", "prov.")}</text>
                      </g>
                    </Marker>
                  );
                }
                const p = g.items[0];
                const [lng, lat] = PROVINCE_COORDS[p.code];
                const r = (4 + Math.sqrt(p.total / max) * 12) * (zoomed ? 1.3 : 1);
                const neg = p.total ? p.negative / p.total : 0;
                const tone = neg >= 0.5 ? "pink" : neg >= 0.3 ? "violet" : "blue";
                const active = sel === p.code;
                return (
                  <Marker key={p.code} coordinates={createCoordinates(lng, lat)}>
                    <g role="button" tabIndex={0} aria-label={`${p.name}: ${p.total}`} style={{ cursor: "pointer" }} onClick={() => setSel(p.code)} onKeyDown={(e) => { if (e.key === "Enter") setSel(p.code); }} onMouseEnter={() => setHover(p.code)} onMouseLeave={() => setHover(null)}>
                      {p.code === busiest || active ? <circle r={r} fill={toneColor(neg)} opacity={0.35} className="nv-map-pulse" style={{ pointerEvents: "none" }} /> : null}
                      <circle r={r + 4} fill={toneColor(neg)} opacity={0.14} />
                      <circle r={r} fill={`url(#nv-dot-${tone})`} stroke={active ? "#101334" : "#FFFFFF"} strokeWidth={active ? 2.5 : 1.5} />
                      {r > 10 ? <text textAnchor="middle" y={4} style={{ fontSize: 9, fontWeight: 900, fill: "#FFFFFF", pointerEvents: "none" }}>{p.total}</text> : null}
                      {zoomed ? <text textAnchor="middle" y={r + 12} style={{ fontSize: 10, fontWeight: 800, fill: "#101334", pointerEvents: "none", paintOrder: "stroke", stroke: "#FFFFFF", strokeWidth: 3 }}>{p.name}</text> : null}
                    </g>
                  </Marker>
                );
              })}
            </ComposableMap>
          ) : (
            <Skeleton className="aspect-[900/360] w-full" />
          )}
          {zoomed ? (
            <button type="button" onClick={() => setView(BASE)} className="absolute right-3 top-3 inline-flex h-9 items-center gap-1.5 rounded-[10px] border-[1.5px] border-[#101334] bg-white px-3 text-[12px] font-bold text-[#101334] shadow-[0_2px_0_#101334] hover:bg-[#F7F8FC]">{L("Whole Indonesia", "Seluruh Indonesia")}</button>
          ) : groups.some((g) => g.items.length > 1) ? (
            <p className="pointer-events-none absolute bottom-12 right-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#5F6B94]">{L("Dashed points group nearby provinces: click to zoom", "Titik bergaris putus = beberapa provinsi berdekatan, klik untuk perbesar")}</p>
          ) : null}
          {hovered ? (
            <div className="pointer-events-none absolute left-3 top-3 rounded-[12px] border border-[#E4E8F2] bg-white px-3 py-2 shadow-[0_10px_30px_rgba(16,19,52,0.12)]">
              <p className="text-[13px] font-black text-[#101334]">{hovered.name}</p>
              <p className="text-[12px] font-semibold text-[#5F6B94]">{hovered.total} {L("records", "catatan")} · {hovered.total ? Math.round((hovered.negative / hovered.total) * 100) : 0}% {L("negative", "negatif")}</p>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 border-t border-[#E4E8F2] bg-white/70 px-3 py-2 text-[11.5px] font-bold text-[#5F6B94]">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#465FFF]" />{L("Mostly calm", "Cenderung aman")}</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#8B5CF6]" />{L("Mixed", "Campuran")}</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#EC4899]" />{L("Mostly negative", "Cenderung negatif")}</span>
            <span className="ml-auto">{q.data ? L(`${q.data.located} of ${q.data.total} records name a place`, `${q.data.located} dari ${q.data.total} catatan menyebut lokasi`) : ""}</span>
          </div>
          {!q.isLoading && !provinces.length ? (
            <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[13px] font-semibold text-[#5F6B94]">{L("No records name a place in Indonesia in this period yet.", "Belum ada catatan yang menyebut lokasi di Indonesia pada periode ini.")}</p>
          ) : null}
        </div>
          {provinces.length ? (
            <ol className="grid gap-1.5 sm:grid-cols-2">
              {provinces.slice(0, 10).map((p, i) => {
                const neg = p.total ? p.negative / p.total : 0;
                return (
                  <li key={p.code}>
                    <button type="button" onClick={() => setSel(p.code)} aria-pressed={sel === p.code} className={cn("flex w-full items-center gap-3 rounded-[12px] border px-3 py-2 text-left transition", sel === p.code ? "border-[#101334] bg-[#F4F6FC]" : "border-[#E4E8F2] bg-white hover:border-[#465FFF]")}>
                      <span className="w-4 text-[12px] font-black tabular-nums text-[#8A94B8]">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2"><span className="truncate text-[13px] font-bold text-[#101334]">{p.name}</span><span className="text-[12.5px] font-black tabular-nums text-[#101334]">{p.total}</span></span>
                        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#EEF0F6]"><span className="block h-full rounded-full" style={{ width: `${(p.total / max) * 100}%`, background: toneColor(neg) }} /></span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>
        {sel ? <ProvinceDetail code={sel} days={days} onClose={() => setSel(null)} /> : null}
      </div>

    </section>
  );
}

export type { RegionBreakdown };
