"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { markToastShown, setToastHandler } from "@/lib/toast-bus";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { recentlyDemoBlocked } from "@/lib/demo-blocked";

type ToastTone = "success" | "error" | "info";

type ToastInput = {
  title?: string;
  description: string;
  tone?: ToastTone;
  duration?: number;
};

type ToastRecord = Required<Omit<ToastInput, "duration">> & {
  id: string;
};

type ToastApi = {
  showToast: (input: string | ToastInput) => void;
  success: (description: string, title?: string) => void;
  error: (description: string, title?: string) => void;
  info: (description: string, title?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const toneStyles: Record<ToastTone, { shell: string; icon: string; Icon: typeof CheckCircle2 }> = {
  success: { shell: "bg-[#0F9D63] text-white", icon: "bg-white text-[#0F9D63]", Icon: CheckCircle2 },
  error: { shell: "bg-[#D92D20] text-white", icon: "bg-white text-[#D92D20]", Icon: XCircle },
  info: { shell: "bg-[#465FFF] text-white", icon: "bg-white text-[#465FFF]", Icon: Info },
};

function createToastId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("Toast");
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const showToast = (input: string | ToastInput) => {
    const normalized = typeof input === "string" ? { description: input } : input;
    // A change refused by the read-only demo already shows the demo notice; its failure toast would only confuse.
    if (normalized.tone === "error" && recentlyDemoBlocked()) return;
    const id = createToastId();
    markToastShown();
    const duration = normalized.duration ?? (normalized.tone === "error" ? 7000 : 4500);
    const toast: ToastRecord = {
      id,
      title: normalized.title ?? (normalized.tone === "error" ? t("error") : normalized.tone === "info" ? t("info") : t("success")),
      description: normalized.description,
      tone: normalized.tone ?? "success",
    };

    setToasts((current) => [...current.slice(-2), toast]);
    window.setTimeout(() => dismiss(id), duration);
  };

  const value: ToastApi = {
    showToast,
    success: (description, title) => showToast({ description, title, tone: "success" }),
    error: (description, title) => showToast({ description, title, tone: "error" }),
    info: (description, title) => showToast({ description, title, tone: "info" }),
  };

  useEffect(() => {
    setToastHandler((t) => showToast(t));
    return () => setToastHandler(null);
  });

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Bottom centre, solid colour, large: impossible to miss after pressing a button. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-8 z-[200] flex flex-col items-center gap-3 px-4" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const styles = toneStyles[toast.tone];
          const Icon = styles.Icon;
          return (
            <div key={toast.id} className={cn("pointer-events-auto flex w-full max-w-[520px] items-center gap-4 rounded-[18px] border-[1.5px] border-[#101334] px-5 py-4 shadow-[0_4px_0_#101334,0_24px_60px_rgba(15,23,42,0.28)] animate-in fade-in zoom-in-95 slide-in-from-bottom-4", styles.shell)} role={toast.tone === "error" ? "alert" : "status"}>
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", styles.icon)}><Icon size={22} strokeWidth={2.6} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-black leading-tight">{toast.title}</p>
                <p className="mt-0.5 text-[14px] font-semibold leading-snug text-white/90">{toast.description}</p>
              </div>
              <button type="button" aria-label={t("close")} onClick={() => dismiss(toast.id)} className="rounded-full p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white">
                <X size={18} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
