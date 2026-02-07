import { create } from "zustand";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  setUser: (user: User) => void;
  toggleAnonymity: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isAnonymous: true,
  setUser: (user) =>
    set({ user, isAuthenticated: true, isAnonymous: user.isAnonymous }),
  toggleAnonymity: () =>
    set((state) => ({ isAnonymous: !state.isAnonymous })),
  logout: () =>
    set({ user: null, isAuthenticated: false, isAnonymous: true }),
}));
