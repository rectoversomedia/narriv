"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Bell, Loader2, Info, ChevronLeft, Calendar, Tag, AlertCircle } from "lucide-react";

type Alert = {
  id: string;
  type: string;
  severity: string;
  title: string;
  whatHappened: string | null;
  whyItMatters: string | null;
  whatToDo: string | null;
  status: string;
  createdAt: string;
};

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
};

const SEVERITY_BORDER_TOP: Record<string, string> = {
  low: "border-t-blue-500",
  medium: "border-t-amber-500",
  high: "border-t-orange-500",
  critical: "border-t-red-500",
};

function Badge({ value, styles }: { value: string; styles: Record<string, string> }) {
  const cls = styles[value.toLowerCase()] ?? "bg-zinc-700 text-zinc-300 border-zinc-600";
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border capitalize ${cls}`}>
      {value}
    </span>
  );
}

export default function AlertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;

    const fetchAlert = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/alerts/${params.id}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Alert not found");
          throw new Error("Failed to fetch alert details");
        }
        const data = await res.json();
        setAlert(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAlert();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500">
        <Loader2 className="animate-spin w-8 h-8 text-red-500 mb-4" />
        <p>Loading alert details...</p>
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-sm text-zinc-400 hover:text-white transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-4 opacity-80" />
          <h2 className="text-lg font-bold mb-2">Error Loading Alert</h2>
          <p>{error || "Alert not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        onClick={() => router.push("/alerts")}
        className="flex items-center text-sm font-medium text-zinc-400 hover:text-white transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Alerts
      </button>

      <div className={`bg-zinc-900 border border-zinc-800 border-t-4 ${SEVERITY_BORDER_TOP[alert.severity.toLowerCase()] || "border-t-zinc-700"} rounded-2xl overflow-hidden shadow-2xl`}>
        {/* Header Section */}
        <div className="p-6 md:p-8 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Badge value={alert.severity} styles={SEVERITY_STYLES} />
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 bg-zinc-800/50 px-3 py-1 rounded-full border border-zinc-700/50">
              <Tag className="w-3 h-3" />
              {alert.type}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(alert.createdAt).toLocaleString()}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
            {alert.title}
          </h1>
        </div>

        {/* Content Section */}
        <div className="p-6 md:p-8 space-y-8">
          <section>
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3">
              <AlertCircle className="w-4 h-4" />
              What Happened
            </h2>
            <div className="bg-zinc-950/30 p-5 rounded-xl border border-zinc-800/50">
              <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {alert.whatHappened || "No details provided."}
              </p>
            </div>
          </section>

          {(alert.whyItMatters || alert.whatToDo) && (
            <div className="grid md:grid-cols-2 gap-6">
              {alert.whyItMatters && (
                <section>
                  <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3">
                    <Info className="w-4 h-4" />
                    Why It Matters
                  </h2>
                  <div className="bg-zinc-950/30 p-5 rounded-xl border border-zinc-800/50 h-full">
                    <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-sm">
                      {alert.whyItMatters}
                    </p>
                  </div>
                </section>
              )}

              {alert.whatToDo && (
                <section>
                  <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3">
                    <Bell className="w-4 h-4" />
                    What To Do
                  </h2>
                  <div className="bg-zinc-950/30 p-5 rounded-xl border border-zinc-800/50 h-full">
                    <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-sm">
                      {alert.whatToDo}
                    </p>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
