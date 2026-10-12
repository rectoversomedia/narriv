"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { monotonePath, niceTicks } from "@/lib/chart-paths";

export type SentimentDay = { date: string; positive: number; neutral: number; negative: number; mixed: number; unanalyzed: number; total: number };

const SERIES = [
  { key: "positive", color: "#10B981" },
  { key: "neutral", color: "#465FFF" },
  { key: "negative", color: "#EF4444" },
] as const;

const M = { top: 8, right: 8, bottom: 20, left: 26 };

function shortDate(iso: string, locale: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" });
}

/**
 * Daily sentiment counts. Lines use monotone smoothing (passes through every
 * value, never overshoots). Days with no signals break the lines and are
 * labelled as such in the tooltip; values shown are the stored counts.
 */
export function SentimentTrendChart({ days, labels, locale = "en-GB" }: { days: SentimentDay[]; labels: { positive: string; neutral: string; negative: string; mixed: string; unanalyzed: string; noSignals: string }; locale?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const height = 120;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const maxCount = Math.max(0, ...days.flatMap((d) => [d.positive, d.neutral, d.negative]));
  const ticks = niceTicks(maxCount, 2, true);
  const top = ticks[ticks.length - 1];
  const plotW = Math.max(0, width - M.left - M.right);
  const plotH = height - M.top - M.bottom;
  const xFor = (i: number) => M.left + (days.length > 1 ? (plotW * i) / (days.length - 1) : plotW / 2);
  const yFor = (v: number) => M.top + plotH - (top > 0 ? (v / top) * plotH : 0);

  const paths = useMemo(
    () => SERIES.map((s) => ({ ...s, d: monotonePath(days.map((day, i) => (day.total > 0 ? { x: xFor(i), y: yFor(day[s.key]) } : null))) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, width, top],
  );

  const activeDay = active !== null ? days[active] : null;
  // Sit beside the guide line, on the side with more room, so the active values stay visible.
  const tooltipLeft = active !== null ? Math.min(Math.max(xFor(active) > width / 2 ? xFor(active) - 148 : xFor(active) + 8, 0), Math.max(0, width - 140)) : 0;

  return (
    <div ref={ref} className="relative w-full select-none">
      {width > 0 ? (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Daily sentiment counts for the last 7 days">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={yFor(t)} y2={yFor(t)} stroke="#EEF1F7" strokeWidth={1} />
              <text x={M.left - 6} y={yFor(t)} dy="0.32em" textAnchor="end" className="fill-[#8A94B8] text-[9px] font-medium">{t}</text>
            </g>
          ))}
          {days.map((d, i) => (
            <text key={d.date} x={xFor(i)} y={height - 5} textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"} className="fill-[#8A94B8] text-[9px] font-medium">
              {i % 2 === 0 || days.length <= 4 ? shortDate(d.date, locale) : ""}
            </text>
          ))}
          {active !== null ? <line x1={xFor(active)} x2={xFor(active)} y1={M.top} y2={M.top + plotH} stroke="#CBD3E4" strokeWidth={1} /> : null}
          <g className="chart-line-draw">
            {paths.map((p) => (
              <path key={p.key} d={p.d} fill="none" stroke={p.color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </g>
          {days.map((d, i) =>
            d.total > 0
              ? SERIES.map((s) => (
                  <circle key={`${d.date}-${s.key}`} cx={xFor(i)} cy={yFor(d[s.key])} r={active === i ? 3.5 : 2} fill={active === i ? s.color : "#FFFFFF"} stroke={s.color} strokeWidth={1.5} />
                ))
              : null,
          )}
          {days.map((d, i) => {
            const half = days.length > 1 ? plotW / (days.length - 1) / 2 : plotW / 2;
            return (
              <rect
                key={`hit-${d.date}`}
                x={xFor(i) - half}
                y={M.top}
                width={half * 2}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${shortDate(d.date, locale)}: ${d.total > 0 ? `${d.positive} ${labels.positive}, ${d.neutral} ${labels.neutral}, ${d.negative} ${labels.negative}` : labels.noSignals}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="cursor-crosshair focus:outline-none"
              />
            );
          })}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      {activeDay ? (
        <div className="pointer-events-none absolute top-0 z-dropdown w-[140px] rounded-control border border-line bg-white px-2.5 py-2 text-[11px] shadow-raised fade-in" style={{ left: tooltipLeft }} role="status">
          <p className="font-semibold text-navy">{shortDate(activeDay.date, locale)}</p>
          {activeDay.total === 0 ? (
            <p className="mt-1 text-subtle">{labels.noSignals}</p>
          ) : (
            <dl className="mt-1 space-y-0.5">
              {SERIES.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-body"><span className="size-1.5 rounded-full" style={{ backgroundColor: s.color }} />{labels[s.key]}</dt>
                  <dd className="font-semibold tabular-nums text-navy">{activeDay[s.key]}</dd>
                </div>
              ))}
              {activeDay.mixed ? <div className="flex justify-between gap-2"><dt className="text-subtle">{labels.mixed}</dt><dd className="tabular-nums text-navy">{activeDay.mixed}</dd></div> : null}
              {activeDay.unanalyzed ? <div className="flex justify-between gap-2"><dt className="text-subtle">{labels.unanalyzed}</dt><dd className="tabular-nums text-navy">{activeDay.unanalyzed}</dd></div> : null}
            </dl>
          )}
        </div>
      ) : null}
    </div>
  );
}
