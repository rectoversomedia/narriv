"use client";

import { useQuery } from "@tanstack/react-query";
import { getWorkspaceSettings, type WorkspaceUseCase } from "@/lib/api-service";

/**
 * What the current workspace monitors for (Settings → What this workspace monitors for), and the pages that do
 * not apply to it. A CVE workspace has no brand to be visible in AI answers, so that page is left out of its menus.
 */
const HIDDEN_PAGES: Record<WorkspaceUseCase, string[]> = {
  brand: [],
  gov: [],
  cve: ["/visibility"],
};

export function useWorkspaceUseCase() {
  const q = useQuery({ queryKey: ["workspace-settings"], queryFn: getWorkspaceSettings, staleTime: 60 * 1000 });
  const useCase: WorkspaceUseCase = q.data?.useCase ?? "brand";
  return { useCase, privacyMode: q.data?.privacyMode ?? false, loaded: q.isSuccess };
}

export function isPageHidden(href: string, useCase: WorkspaceUseCase) {
  return HIDDEN_PAGES[useCase].includes(href);
}
