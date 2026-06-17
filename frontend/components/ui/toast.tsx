"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

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
  success: {
    shell: "border-[#CDEEDD] bg-[#F1FCF6] text-[#047857]",
    icon: "bg-[#10B981]/10 text-[#10B981]",
    Icon: CheckCircle2,
  },
  error: {
    shell: "border-[#FAD1D1] bg-[#FFF5F5] text-[#B42318]",
    icon: "bg-[#EF4444]/10 text-[#EF4444]",
    Icon: XCircle,
  },
  info: {
    shell: "border-[#D7E2FF] bg-[#F5F7FF] text-[#3446B5]",
    icon: "bg-[#465FFF]/10 text-[#465FFF]",
    Icon: Info,
  },
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
    const id = createToastId();
    const duration = normalized.duration ?? 4000;
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

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-[90] flex w-[calc(100vw-40px)] max-w-[390px] flex-col gap-3" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const styles = toneStyles[toast.tone];
          const Icon = styles.Icon;

          return (
            <div key={toast.id} className={cn("flex items-start gap-3 rounded-[14px] border px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.14)] backdrop-blur animate-in fade-in slide-in-from-bottom-3", styles.shell)} role={toast.tone === "error" ? "alert" : "status"}>
              <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", styles.icon)}>
                <Icon size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-black">{toast.title}</p>
                <p className="mt-0.5 text-[12px] font-bold leading-5 opacity-85">{toast.description}</p>
              </div>
              <button type="button" aria-label={t("close")} onClick={() => dismiss(toast.id)} className="rounded-full p-1 opacity-65 transition hover:bg-black/5 hover:opacity-100">
                <X size={14} />
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
