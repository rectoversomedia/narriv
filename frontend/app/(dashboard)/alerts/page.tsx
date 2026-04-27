"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { AlertTriangle, Bell, Loader2, Info, ChevronRight, CheckCircle2, Filter } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

type Alert = {
  id: string;
  type: string;
  severity: string;
  title: string;
  status: string;
  createdAt: string;
};

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  risk: <AlertTriangle className="w-4 h-4 text-red-400" />,
  opportunity: <Info className="w-4 h-4 text-emerald-400" />,
  positioning: <Bell className="w-4 h-4 text-blue-400" />,
};

function Badge({ value, styles }: { value: string; styles: Record<string, string> }) {
  const cls = styles[value.toLowerCase()] ?? "bg-zinc-700 text-zinc-300 border-zinc-600";
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${cls}`}>
      {value}
    </span>
  );
}

function AlertsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync filters from URL
  const typeParam = searchParams.get("type") || "";
  const severityParam = searchParams.get("severity") || "";
  const statusParam = searchParams.get("status") || "";

  const updateQuery = useCallback(
    (params: Record<string, string | null>) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      Object.entries(params).forEach(([key, value]) => {
        if (!value) current.delete(key);
        else current.set(key, value);
      });
      const search = current.toString();
      router.push(`${pathname}${search ? `?${search}` : ""}`);
    },
    [searchParams, pathname, router]
  );

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams();
        if (typeParam) queryParams.append("type", typeParam);
        if (severityParam) queryParams.append("severity", severityParam);
        if (statusParam) queryParams.append("status", statusParam);

        const res = await fetch(`http://localhost:3000/api/alerts?${queryParams.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch alerts");
        const data = await res.json();
        setAlerts(data.data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, [typeParam, severityParam, statusParam]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Bell className="text-red-500" />
            Intelligence Alerts
          </h1>
          <p className="text-zinc-400 mt-1">Automated anomaly and risk detections.</p>
        </div>

        {/* Filters UI */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto bg-zinc-900/50 p-2 rounded-xl border border-zinc-800/50">
          <div className="flex items-center gap-2 px-2 text-zinc-500 mr-1">
            <Filter size={14} />
            <span className="text-xs font-medium uppercase tracking-wider">Filters</span>
          </div>
          
          <select
            value={typeParam}
            onChange={(e) => updateQuery({ type: e.target.value })}
            className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-red-500 transition-colors cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="risk">Risk</option>
            <option value="opportunity">Opportunity</option>
            <option value="positioning">Positioning</option>
          </select>

          <select
            value={severityParam}
            onChange={(e) => updateQuery({ severity: e.target.value })}
            className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-red-500 transition-colors cursor-pointer"
          >
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <select
            value={statusParam}
            onChange={(e) => updateQuery({ status: e.target.value })}
            className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-red-500 transition-colors cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>

          {(typeParam || severityParam || statusParam) && (
            <button
              onClick={() => router.push(pathname)}
              className="text-xs text-zinc-500 hover:text-white px-2 py-1 transition-colors underline underline-offset-4"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-500 bg-zinc-900/30 rounded-xl border border-zinc-800 border-dashed">
          <Loader2 className="animate-spin w-8 h-8 text-red-500 mb-4" />
          <p>Scanning for alerts...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-80" />
          <p>{error}</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-500 bg-zinc-900/30 rounded-xl border border-zinc-800 border-dashed">
          <CheckCircle2 className="w-12 h-12 mb-4 text-emerald-500/50" />
          <p className="text-zinc-400 font-medium text-lg">No alerts found</p>
          <p className="text-sm mt-1 text-zinc-500">Try adjusting your filters or check back later.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => router.push(`/alerts/${alert.id}`)}
              className="bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 p-5 rounded-xl transition-all cursor-pointer group flex flex-col md:flex-row gap-4 justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 p-2 bg-zinc-950 rounded-lg border border-zinc-800 shadow-inner">
                  {TYPE_ICONS[alert.type.toLowerCase()] || <Bell className="w-4 h-4 text-zinc-400" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge value={alert.severity} styles={SEVERITY_STYLES} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                      {alert.type}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium bg-zinc-800/50 px-2 py-0.5 rounded border border-zinc-700/30">
                      {alert.status}
                    </span>
                    <span className="text-xs text-zinc-500 ml-2">
                      {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-red-400 transition-colors">
                    {alert.title}
                  </h3>
                </div>
              </div>
              <div className="flex items-center justify-end md:w-auto">
                <div className="hidden md:flex items-center text-sm font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  View Detail
                  <ChevronRight className="w-4 h-4 ml-1 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AlertsPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex items-center justify-center min-h-64">
        <Loader2 className="animate-spin text-red-500 w-8 h-8" />
      </div>
    }>
      <AlertsContent />
    </Suspense>
  );
}
