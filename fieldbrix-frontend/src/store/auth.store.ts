import { create } from "zustand";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  roles?: string[];
  tenantId?: string;
}

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  setAuth: (token: string, refreshToken?: string, user?: UserProfile) => void;
  setUser: (user: UserProfile | null) => void;
  logout: () => void;
}

const TOKEN_KEY = "fieldbrix_token";
const REFRESH_TOKEN_KEY = "fieldbrix_refresh_token";

const getInitialToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const getInitialRefreshToken = (): string | null => {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  token: getInitialToken(),
  refreshToken: getInitialRefreshToken(),
  user: null,
  isAuthenticated: Boolean(getInitialToken()),

  setAuth: (token, refreshToken, user) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
    } catch {
      // Ignore storage errors in private browsing/sandboxes
    }
    set({
      token,
      refreshToken: refreshToken ?? null,
      user: user ?? null,
      isAuthenticated: true,
    });
  },

  setUser: (user) => set({ user }),

  logout: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // Ignore
    }
    set({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },
}));
