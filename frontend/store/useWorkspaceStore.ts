import { create } from "zustand";
import { persist } from "zustand/middleware";

// The workspace the user is working in. Sent as X-Workspace-Id on every API
// call; the backend checks membership, so a stale id can only narrow access.
type WorkspaceState = {
  selectedWorkspaceId: string | null;
  setSelectedWorkspaceId: (id: string | null) => void;
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      selectedWorkspaceId: null,
      setSelectedWorkspaceId: (selectedWorkspaceId) => set({ selectedWorkspaceId }),
    }),
    { name: "narriv-workspace" },
  ),
);
