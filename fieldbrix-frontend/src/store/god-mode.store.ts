import { create } from "zustand";

export type GodSession = { id: string; tenantId: string; expiresAt: string };

const STORAGE_KEY = "fieldbrix_god_session_id";

interface GodModeState {
  session: GodSession | null;
  setSession: (session: GodSession | null) => void;
}

export const useGodModeStore = create<GodModeState>((set) => ({
  session: null,
  setSession: (session) => {
    try {
      if (session) {
        localStorage.setItem(STORAGE_KEY, session.id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage may be unavailable (private browsing, test environments).
    }
    set({ session });
  },
}));

export function getStoredGodSessionId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
