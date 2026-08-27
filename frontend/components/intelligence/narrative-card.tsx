"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NarrativeStatus =
  | "emerging"
  | "growing"
  | "stable"
  | "declining"
  | "escalating"
  | "resolved";

export type NarrativeType =
  | "reputation"
  | "product"
  | "service"
  | "campaign"
  | "customer_experience"
  | "pricing"
  | "competitor"
  | "regulatory"
  | "political"
  | "industry"
  | "crisis"
  | "opportunity"
  | "innovation"
  | "brand_perception";

export type NarrativeSentiment = "positive" | "neutral" | "negative" | "mixed";

export type ActionPriority = "immediate" | "high" | "medium" | "low";

export interface NarrativeCardProps {
  id: string;
  title: string;
  summary: string;
  status: NarrativeStatus;
  type: NarrativeType;
  sentiment: NarrativeSentiment;
  emotion: string;
  volume: number;
  growth: number;
  velocity: number;
  momentum: number;
  confidence: number;
  firstDetected: string;
  latestActivity: string;
  primaryChannel: string;
  relatedKeywords: string[];
  relatedEntities: string[];
  relatedCompetitors: string[];
  whyItMatters: string;
  possibleImpact: string;
  recommendedAction: string;
  actionPriority?: ActionPriority;
  onClick?: () => void;
  selected?: boolean;
}

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  NarrativeStatus,
  { label: string; variant: "default" | "green" | "amber" | "red" | "purple" | "slate" }
> = {
  emerging: { label: "Emerging", variant: "purple" },
  growing: { label: "Growing", variant: "green" },
  stable: { label: "Stable", variant: "slate" },
  declining: { label: "Declining", variant: "amber" },
  escalating: { label: "Escalating", variant: "red" },
  resolved: { label: "Resolved", variant: "slate" },
};

// ---------------------------------------------------------------------------
// Sentiment dot config
// ---------------------------------------------------------------------------

const SENTIMENT_CONFIG: Record<
  NarrativeSentiment,
  { dotColor: string; label: string }
> = {
  positive: { dotColor: "#10B981", label: "Positive" },
  neutral: { dotColor: "#94A3B8", label: "Neutral" },
  negative: { dotColor: "#EF4444", label: "Negative" },
  mixed: { dotColor: "#F59E0B", label: "Mixed" },
};

// ---------------------------------------------------------------------------
// Priority config
// ---------------------------------------------------------------------------

const PRIORITY_CONFIG: Record<
  ActionPriority,
  { label: string; bg: string; text: string }
> = {
  immediate: { label: "Immediate", bg: "bg-red-50", text: "text-red-600" },
  high: { label: "High", bg: "bg-amber-50", text: "text-amber-600" },
  medium: { label: "Medium", bg: "bg-blue-50", text: "text-blue-600" },
  low: { label: "Low", bg: "bg-slate-50", text: "text-slate-500" },
};

// ---------------------------------------------------------------------------
// Metric pill
// ---------------------------------------------------------------------------

function MetricPill({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1">
      <span className="text-[11px] text-[#68739F]">{label}</span>
      <span className={cn("text-[11px] font-bold", valueColor)}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confidence bar
// ---------------------------------------------------------------------------

function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 75
      ? "bg-green-500"
      : value >= 50
        ? "bg-amber-500"
        : "bg-red-400";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#68739F]">AI Confidence</span>
        <span className="text-[11px] font-bold text-[#101334]">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NarrativeCard
// ---------------------------------------------------------------------------

export function NarrativeCard({
  title,
  summary,
  status,
  type,
  sentiment,
  emotion,
  volume,
  growth,
  velocity,
  momentum,
  confidence,
  firstDetected,
  latestActivity,
  primaryChannel,
  relatedKeywords,
  relatedEntities,
  relatedCompetitors,
  whyItMatters,
  possibleImpact,
  recommendedAction,
  actionPriority = "medium",
  onClick,
  selected = false,
}: NarrativeCardProps) {
  const [expanded, setExpanded] = useState(false);

  const statusCfg = STATUS_CONFIG[status];
  const sentimentCfg = SENTIMENT_CONFIG[sentiment];
  const priorityCfg = PRIORITY_CONFIG[actionPriority];

  const growthLabel =
    growth >= 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
  const growthColor =
    growth > 0
      ? "text-green-600"
      : growth < 0
        ? "text-red-500"
        : "text-slate-500";

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setExpanded((e) => !e);
    }
  };

  return (
    <div
      onClick={handleClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "relative cursor-pointer rounded-[14px] border border-slate-200 bg-white p-4",
        "shadow-sm transition-all duration-200",
        "hover:border-slate-300 hover:shadow-md",
        selected &&
          "ring-2 ring-[#465FFF] border-[#465FFF] hover:border-[#465FFF]",
        onClick && "cursor-pointer"
      )}
    >
      {/* Status badge — top right */}
      <div className="absolute right-3 top-3">
        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
      </div>

      {/* Title */}
      <h3 className="mb-1 pr-16 text-[18px] font-bold leading-snug text-[#101334]">
        {title}
      </h3>

      {/* Summary */}
      <p className="mb-3 text-[14px] leading-relaxed text-[#68739F]">{summary}</p>

      {/* Sentiment + emotion row */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Sentiment dot + label */}
        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: sentimentCfg.dotColor }}
          />
          <span className="text-[12px] font-medium text-[#68739F]">
            {sentimentCfg.label}
          </span>
        </div>

        {/* Emotion tag */}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 capitalize">
          {emotion}
        </span>

        {/* Type tag */}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 capitalize">
          {type.replace(/_/g, " ")}
        </span>
      </div>

      {/* Metrics row */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <MetricPill
          label="Volume"
          value={volume.toLocaleString()}
          valueColor="text-[#101334]"
        />
        <MetricPill
          label="Growth"
          value={growthLabel}
          valueColor={growthColor}
        />
        <MetricPill
          label="Velocity"
          value={`${velocity}`}
          valueColor="text-[#8B5CFF]"
        />
        <MetricPill
          label="Momentum"
          value={`${momentum}`}
          valueColor="text-[#465FFF]"
        />
      </div>

      {/* Confidence bar */}
      <div className="mb-3">
        <ConfidenceBar value={confidence} />
      </div>

      {/* Why It Matters / Possible Impact — collapsible */}
      <div className="mb-3 space-y-2">
        <div>
          <p className="text-[12px] font-semibold text-[#101334]">Why It Matters</p>
          <p className="text-[13px] text-[#68739F]">{whyItMatters}</p>
        </div>
        <div>
          <p className="text-[12px] font-semibold text-[#101334]">Possible Impact</p>
          <p className="text-[13px] text-[#68739F]">{possibleImpact}</p>
        </div>
      </div>

      {/* Recommended Action — highlighted box */}
      <div
        className={cn(
          "rounded-[10px] border p-3",
          priorityCfg.bg,
          "border-slate-200"
        )}
      >
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-[#101334]">
            Recommended Action
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              priorityCfg.bg,
              priorityCfg.text,
              "border border-current/20"
            )}
          >
            {priorityCfg.label}
          </span>
        </div>
        <p className="text-[13px] text-[#101334]">{recommendedAction}</p>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 border-t border-slate-100 pt-3 space-y-3">
          {/* Meta info */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-[#68739F]">
            <span>First detected:</span>
            <span className="font-medium text-[#101334]">
              {new Date(firstDetected).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span>Latest activity:</span>
            <span className="font-medium text-[#101334]">
              {new Date(latestActivity).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span>Primary channel:</span>
            <span className="font-medium text-[#101334]">{primaryChannel}</span>
          </div>

          {/* Related keywords */}
          {relatedKeywords.length > 0 && (
            <div>
              <p className="mb-1 text-[12px] font-semibold text-[#101334]">Keywords</p>
              <div className="flex flex-wrap gap-1">
                {relatedKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Related entities */}
          {relatedEntities.length > 0 && (
            <div>
              <p className="mb-1 text-[12px] font-semibold text-[#101334]">Entities</p>
              <div className="flex flex-wrap gap-1">
                {relatedEntities.map((entity) => (
                  <span
                    key={entity}
                    className="rounded-full bg-[#465FFF]/10 px-2 py-0.5 text-[11px] font-medium text-[#465FFF]"
                  >
                    {entity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Related competitors */}
          {relatedCompetitors.length > 0 && (
            <div>
              <p className="mb-1 text-[12px] font-semibold text-[#101334]">Competitors</p>
              <div className="flex flex-wrap gap-1">
                {relatedCompetitors.map((comp) => (
                  <span
                    key={comp}
                    className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600"
                  >
                    {comp}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NarrativeCard;
