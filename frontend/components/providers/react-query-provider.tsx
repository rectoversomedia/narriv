"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useUiStore } from "@/store/useUiStore";

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
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
