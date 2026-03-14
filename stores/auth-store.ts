import { create } from "zustand";

interface AuthStore {
  clubId: string | null;
  setClubId: (id: string | null) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  clubId: null,
  setClubId: (id) => set({ clubId: id }),
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
