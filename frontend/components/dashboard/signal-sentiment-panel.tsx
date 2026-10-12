import type { DashboardKPIs } from "@/lib/api-service";

// Signal volume and sentiment share for the selected period, from the
// dashboard summary KPIs (no extra requests). A measured zero shows "0.0%";
// a missing value, or a period with no analysed signals, shows "—" with a
// reason instead of being presented as zero.

type Labels = {
  totalSignals: string;
  analyzedSignals: string;
  positive: string;
  negative: string;
  neutral: string;
  mixed: string;
};

const SENTIMENTS = [
  { key: "positive_percentage", label: "positive", bar: "bg-[#10B981]", dot: "bg-[#10B981]", text: "text-[#047857]" },
  { key: "neutral_percentage", label: "neutral", bar: "bg-[#94A3B8]", dot: "bg-[#94A3B8]", text: "text-[#475569]" },
  { key: "mixed_percentage", label: "mixed", bar: "bg-[#F59E0B]", dot: "bg-[#F59E0B]", text: "text-[#A04606]" },
  { key: "negative_percentage", label: "negative", bar: "bg-[#EF4444]", dot: "bg-[#EF4444]", text: "text-[#C81E1E]" },
] as const;

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function formatCount(value: number | null | undefined) {
  return isNumber(value) ? value.toLocaleString("en-US") : "—";
}

export function SignalSentimentPanel({ kpis, labels }: { kpis: Partial<DashboardKPIs> | null | undefined; labels: Labels }) {
  const total = kpis?.total_signals;
  const analyzed = kpis?.analyzed_signals;
  const coverage = isNumber(total) && isNumber(analyzed) && total > 0 ? Math.round((analyzed / total) * 100) : null;
  const noAnalysis = isNumber(analyzed) && analyzed === 0;

  const shares = SENTIMENTS.map((s) => {
    const raw = kpis?.[s.key];
    const value = !noAnalysis && isNumber(raw) ? raw : null;
    return { ...s, name: labels[s.label], value };
  });
  const barTotal = shares.reduce((sum, s) => sum + (s.value ?? 0), 0);
  const sentimentNote = noAnalysis ? "No analyzed signals yet" : "No data";

  return (
    <section aria-label="Signals and sentiment" className="grid gap-3 rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_2px_12px_rgba(16,24,40,0.03)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2fr)] lg:gap-0">
      {/* Volume */}
      <div className="grid grid-cols-2 gap-3 lg:pr-5">
        {[
          { label: labels.totalSignals, value: total },
          { label: labels.analyzedSignals, value: analyzed },
        ].map((m) => (
          <div key={m.label} className="rounded-[10px] bg-[#F8FAFC] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5A6478]">{m.label}</p>
            <p className="mt-1.5 text-[26px] font-bold leading-none tabular-nums text-[#101334]">{formatCount(m.value)}</p>
            {!isNumber(m.value) ? <p className="mt-1 text-[11px] font-medium text-[#5A6478]">No data</p> : null}
          </div>
        ))}
        <p className="col-span-2 text-[12px] font-medium text-[#5A6478]">
          {coverage === null ? "Analysis coverage appears once signals are collected." : `${coverage}% of signals analyzed`}
        </p>
      </div>

      {/* Sentiment share */}
      <div className="border-t border-slate-100 pt-3 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5A6478]">Sentiment share</p>
        {barTotal > 0 ? (
          <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={shares.map((s) => `${s.name} ${s.value === null ? "no data" : `${s.value.toFixed(1)}%`}`).join(", ")}>
            {shares.map((s) => (s.value ? <span key={s.key} className={s.bar} style={{ width: `${(s.value / barTotal) * 100}%` }} /> : null))}
          </div>
        ) : (
          <div className="mt-2 h-2.5 w-full rounded-full bg-slate-100" aria-hidden="true" />
        )}
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {shares.map((s) => (
            <div key={s.key} className="rounded-[10px] border border-slate-100 p-3">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5A6478]">
                <span className={`size-2 shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
                {s.name}
              </dt>
              <dd className={`mt-1.5 text-[22px] font-bold leading-none tabular-nums ${s.value === null ? "text-[#5A6478]" : s.text}`}>
                {s.value === null ? "—" : `${s.value.toFixed(1)}%`}
              </dd>
              {s.value === null ? <dd className="mt-1 text-[11px] font-medium text-[#5A6478]">{sentimentNote}</dd> : null}
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
