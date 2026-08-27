"use client";

import { useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NarrativeSentiment = "positive" | "negative" | "mixed" | "neutral";
export type NarrativeMomentum = "growing" | "stable" | "declining" | "escalating";

export interface NarrativeMapNarrative {
  id: string;
  title: string;
  volume: number;
  sentiment: NarrativeSentiment;
  momentum: NarrativeMomentum;
  growth: number;
}

export interface NarrativeMapProps {
  brandName: string;
  narratives: NarrativeMapNarrative[];
  onNarrativeClick?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SENTIMENT_COLORS: Record<NarrativeSentiment, string> = {
  positive: "#22c55e",
  negative: "#ef4444",
  mixed: "#f59e0b",
  neutral: "#94a3b8",
};

const BRAND_COLOR = "#465FFF";

const MIN_SIZE = 40;
const MAX_SIZE = 120;
const BRAND_SIZE = 140;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getBubbleRadius(volume: number, minVol: number, maxVol: number): number {
  const normalized = maxVol === minVol ? 0.5 : (volume - minVol) / (maxVol - minVol);
  return clamp(MIN_SIZE / 2 + normalized * ((MAX_SIZE - MIN_SIZE) / 2), MIN_SIZE / 2, MAX_SIZE / 2);
}

// ---------------------------------------------------------------------------
// Momentum Arrow SVG
// ---------------------------------------------------------------------------

function MomentumArrow({ momentum, x, y, size }: { momentum: NarrativeMomentum; x: number; y: number; size: number }) {
  if (momentum === "stable" || momentum === "declining") return null;

  const arrowSize = Math.max(8, size * 0.18);
  const offset = size * 0.32;

  if (momentum === "escalating") {
    // Double chevron up
    return (
      <g transform={`translate(${x + offset}, ${y - offset})`}>
        <path
          d={`M ${-arrowSize * 0.5} ${arrowSize * 0.5} L 0 ${-arrowSize * 0.5} L ${arrowSize * 0.5} ${arrowSize * 0.5} M ${-arrowSize * 0.5} 0 L 0 ${-arrowSize} L ${arrowSize * 0.5} 0`}
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.9"
        />
      </g>
    );
  }

  // growing — single chevron up
  return (
    <g transform={`translate(${x + offset}, ${y - offset})`}>
      <path
        d={`M ${-arrowSize * 0.5} ${arrowSize * 0.1} L 0 ${-arrowSize * 0.7} L ${arrowSize * 0.5} ${arrowSize * 0.1}`}
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.9"
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  narrative: NarrativeMapNarrative | null;
}

function Tooltip({ state, containerWidth, containerHeight }: { state: TooltipState; containerWidth: number; containerHeight: number }) {
  if (!state.visible || !state.narrative) return null;

  const sentimentLabel =
    state.narrative.sentiment.charAt(0).toUpperCase() + state.narrative.sentiment.slice(1);
  const momentumLabel =
    state.narrative.momentum.charAt(0).toUpperCase() + state.narrative.momentum.slice(1);

  const tooltipWidth = 200;
  const tooltipHeight = 100;
  const padding = 12;

  // Smart positioning — flip if near edges
  let tx = state.x + 16;
  let ty = state.y - tooltipHeight / 2;
  if (tx + tooltipWidth > containerWidth - padding) tx = state.x - tooltipWidth - 8;
  if (ty < padding) ty = padding;
  if (ty + tooltipHeight > containerHeight - padding) ty = containerHeight - tooltipHeight - padding;

  return (
    <div
      style={{
        position: "absolute",
        left: tx,
        top: ty,
        width: tooltipWidth,
        height: tooltipHeight,
        background: "rgba(15, 23, 42, 0.95)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        padding: "8px 12px",
        color: "#f1f5f9",
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
        lineHeight: 1.5,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <p style={{ fontWeight: 700, margin: 0, marginBottom: 4, fontSize: 13, color: "#fff" }}>
        {state.narrative.title}
      </p>
      <p style={{ margin: 0, marginBottom: 3, opacity: 0.85 }}>
        Volume: <strong style={{ color: "#e2e8f0" }}>{state.narrative.volume.toLocaleString()}</strong>
      </p>
      <p style={{ margin: 0, marginBottom: 3, opacity: 0.85 }}>
        Growth:{" "}
        <strong style={{ color: state.narrative.growth >= 0 ? "#4ade80" : "#f87171" }}>
          {state.narrative.growth >= 0 ? "+" : ""}
          {state.narrative.growth}%
        </strong>
      </p>
      <p style={{ margin: 0, opacity: 0.85 }}>
        {sentimentLabel} · {momentumLabel}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid background pattern
// ---------------------------------------------------------------------------

function GridPattern() {
  return (
    <defs>
      <pattern id="narrative-map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path
          d="M 40 0 L 0 0 0 40"
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="1"
        />
      </pattern>
      <filter id="narrative-map-glow">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

// ---------------------------------------------------------------------------
// Narrative Bubble
// ---------------------------------------------------------------------------

interface BubbleProps {
  narrative: NarrativeMapNarrative;
  cx: number;
  cy: number;
  r: number;
  onClick?: (id: string) => void;
  onHover: (narrative: NarrativeMapNarrative, x: number, y: number, visible: boolean) => void;
}

function NarrativeBubble({ narrative, cx, cy, r, onClick, onHover }: BubbleProps) {
  const color = SENTIMENT_COLORS[narrative.sentiment];
  const displayR = Math.max(r, 20);

  // Text truncation — keep it to what fits
  const maxChars = Math.floor((displayR * Math.PI) / 7);
  const label =
    narrative.title.length > maxChars
      ? narrative.title.slice(0, maxChars - 1) + "…"
      : narrative.title;

  const isGrowing = narrative.momentum === "growing" || narrative.momentum === "escalating";

  return (
    <g
      onClick={() => onClick?.(narrative.id)}
      onMouseEnter={(e) => onHover(narrative, e.currentTarget.ownerSVGElement ? cx : cx, cy, true)}
      onMouseLeave={() => onHover(narrative, cx, cy, false)}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {/* Outer glow ring for growing/escalating */}
      {isGrowing && (
        <circle
          cx={cx}
          cy={cy}
          r={displayR + 4}
          fill="none"
          stroke={color}
          strokeWidth={2}
          opacity={0.3}
          filter="url(#narrative-map-glow)"
        />
      )}

      {/* Main bubble */}
      <circle
        cx={cx}
        cy={cy}
        r={displayR}
        fill={color}
        fillOpacity={0.85}
        stroke={color}
        strokeWidth={1.5}
        strokeOpacity={0.6}
      />

      {/* Inner highlight */}
      <circle
        cx={cx - displayR * 0.28}
        cy={cy - displayR * 0.28}
        r={displayR * 0.35}
        fill="rgba(255,255,255,0.12)"
      />

      {/* Label */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#ffffff"
        fontSize={Math.max(8, Math.min(13, displayR * 0.32))}
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {label}
      </text>

      {/* Momentum arrow */}
      <MomentumArrow momentum={narrative.momentum} x={cx} y={cy} size={displayR * 2} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Main NarrativeMap
// ---------------------------------------------------------------------------

export function NarrativeMap({ brandName, narratives, onNarrativeClick }: NarrativeMapProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    narrative: null,
  });

  const WIDTH = 600;
  const HEIGHT = 400;
  const CENTER_X = WIDTH / 2;
  const CENTER_Y = HEIGHT / 2;

  const handleHover = useCallback(
    (narrative: NarrativeMapNarrative, x: number, y: number, visible: boolean) => {
      setTooltip({ visible, x, y, narrative: visible ? narrative : null });
    },
    []
  );

  // Sort narratives by volume to determine relative sizing
  const volumes = narratives.map((n) => n.volume);
  const minVol = Math.min(...volumes);
  const maxVol = Math.max(...volumes);

  // Position surrounding bubbles in a radial layout
  const totalBubbles = narratives.length;
  const orbitRadius = Math.min(WIDTH, HEIGHT) / 2 - 80; // distance from center to bubble centers
  const bubblePositions = narratives.map((narrative, i) => {
    // Spread evenly in a circle, with slight randomization to avoid perfect overlap
    const baseAngle = (i / totalBubbles) * 2 * Math.PI;
    const jitter = (i % 3 - 1) * 0.1; // small jitter to break symmetry
    const angle = baseAngle + jitter;

    const r = getBubbleRadius(narrative.volume, minVol, maxVol);
    const cx = CENTER_X + (orbitRadius - r) * Math.cos(angle);
    const cy = CENTER_Y + (orbitRadius - r) * Math.sin(angle);

    return { narrative, cx, cy, r };
  });

  return (
    <div className="relative inline-block" style={{ width: WIDTH, height: HEIGHT }}>
      <svg
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ background: "#0f172a", borderRadius: 16, display: "block" }}
        aria-label={`Narrative map for ${brandName}`}
        role="img"
      >
        <GridPattern />

        {/* Grid background */}
        <rect width={WIDTH} height={HEIGHT} fill="url(#narrative-map-grid)" />

        {/* Subtle radial gradient overlay */}
        <defs>
          <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={BRAND_COLOR} stopOpacity="0.08" />
            <stop offset="100%" stopColor={BRAND_COLOR} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="url(#center-glow)" />

        {/* Connection lines from center to bubbles */}
        {bubblePositions.map(({ cx, cy }) => (
          <line
            key={`line-${cx}-${cy}`}
            x1={CENTER_X}
            y1={CENTER_Y}
            x2={cx}
            y2={cy}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        ))}

        {/* Narrative bubbles */}
        {bubblePositions.map(({ narrative, cx, cy, r }) => (
          <NarrativeBubble
            key={narrative.id}
            narrative={narrative}
            cx={cx}
            cy={cy}
            r={r}
            onClick={onNarrativeClick}
            onHover={handleHover}
          />
        ))}

        {/* Brand center bubble */}
        <g>
          {/* Outer glow */}
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={BRAND_SIZE / 2 + 10}
            fill={BRAND_COLOR}
            fillOpacity={0.12}
            filter="url(#narrative-map-glow)"
          />
          {/* Main bubble */}
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={BRAND_SIZE / 2}
            fill={BRAND_COLOR}
            fillOpacity={0.92}
            stroke={BRAND_COLOR}
            strokeWidth={2}
            strokeOpacity={0.8}
          />
          {/* Inner highlight */}
          <circle
            cx={CENTER_X - BRAND_SIZE * 0.25}
            cy={CENTER_Y - BRAND_SIZE * 0.25}
            r={BRAND_SIZE * 0.3}
            fill="rgba(255,255,255,0.15)"
          />
          {/* Brand label */}
          <text
            x={CENTER_X}
            y={CENTER_Y - 6}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#ffffff"
            fontSize={14}
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {brandName}
          </text>
          <text
            x={CENTER_X}
            y={CENTER_Y + 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255,255,255,0.7)"
            fontSize={10}
            fontWeight="500"
            fontFamily="system-ui, sans-serif"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            BRAND
          </text>
        </g>

        {/* Tooltip */}
        <Tooltip state={tooltip} containerWidth={WIDTH} containerHeight={HEIGHT} />
      </svg>
    </div>
  );
}

export default NarrativeMap;
