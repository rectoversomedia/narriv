"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { emitToast, toastShownSince } from "@/lib/toast-bus";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useUiStore } from "@/store/useUiStore";

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Every button that saves or changes something answers with a clear success or failure toast. A page that
        // already shows its own message for that action wins (checked just after its callbacks ran); background
        // writes opt out with meta: { silent: true }.
        mutationCache: new MutationCache({
          onSuccess: (_data, _vars, _ctx, mutation) => {
            if (mutation.meta?.silent) return;
            const started = mutation.state.submittedAt || Date.now();
            window.setTimeout(() => {
              if (toastShownSince(started)) return;
              const id = useUiStore.getState().language === "id";
              emitToast({ tone: "success", description: id ? "Berhasil disimpan." : "Saved." });
            }, 300);
          },
          onError: (error, _vars, _ctx, mutation) => {
            if (mutation.meta?.silent) return;
            const started = mutation.state.submittedAt || Date.now();
            window.setTimeout(() => {
              if (toastShownSince(started)) return;
              const id = useUiStore.getState().language === "id";
              const msg = error instanceof Error && error.message && error.message.length < 140 ? ` ${error.message}` : "";
              emitToast({ tone: "error", description: (id ? "Gagal. Coba lagi." : "That did not work. Please try again.") + msg });
            }, 300);
          },
        }),
        defaultOptions: {
          queries: {
            // Monitoring data changes hourly, so pages reuse what they loaded for two minutes and keep it for
            // half an hour: going back to a page shows it at once and refreshes quietly in the background.
            staleTime: 2 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  // The backend writes generated text (recommendations, briefs, risk explanations) in the UI language, sent as
  // Accept-Language; refetch everything when the language changes so no panel keeps the other language.
  const language = useUiStore((state) => state.language);
  const previous = useRef(language);
  useEffect(() => {
    if (previous.current === language) return;
    previous.current = language;
    void queryClient.invalidateQueries();
  }, [language, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
