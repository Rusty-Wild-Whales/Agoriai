import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../types";

// Visibility levels from most private to most public
export type VisibilityLevel = "anonymous" | "role" | "school" | "realName";

export const visibilityLabels: Record<VisibilityLevel, string> = {
  anonymous: "Fully Anonymous",
  role: "Role Visible",
  school: "School Visible",
  realName: "Real Name Visible",
};

export const visibilityDescriptions: Record<VisibilityLevel, string> = {
  anonymous: "Only your alias and avatar are shown",
  role: "Your field of interest is visible",
  school: "Your university and graduation year are visible",
  realName: "Your full name and profile are visible",
};

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  visibilityLevel: VisibilityLevel;
  setAuth: (payload: { user: User; token: string }) => void;
  setUser: (user: User) => void;
  setVisibilityLevel: (level: VisibilityLevel) => void;
  logout: () => void;
  getDisplayName: () => string;
  getVisibleInfo: () => {
    name: string;
    role?: string;
    school?: string;
    year?: number;
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      visibilityLevel: "anonymous",

      setAuth: ({ user, token }) => {
        localStorage.setItem("auth_token", token);
        set({ user, token, isAuthenticated: true });
      },

      setUser: (user) =>
        set((state) => ({ user, isAuthenticated: true, token: state.token })),

      setVisibilityLevel: (level) =>
        set({ visibilityLevel: level }),

      logout: () => {
        localStorage.removeItem("auth_token");
        set({ user: null, token: null, isAuthenticated: false, visibilityLevel: "anonymous" });
      },

      getDisplayName: () => {
        const { user, visibilityLevel } = get();
        if (!user) return "Anonymous";

        switch (visibilityLevel) {
          case "realName":
            return user.realName || user.anonAlias;
          default:
            return user.anonAlias;
        }
      },

      getVisibleInfo: () => {
        const { user, visibilityLevel } = get();
        if (!user) return { name: "Anonymous" };

        const info: {
          name: string;
          role?: string;
          school?: string;
          year?: number;
        } = { name: user.anonAlias };

        if (visibilityLevel === "realName") {
          info.name = user.realName || user.anonAlias;
          info.role = user.fieldsOfInterest[0];
          info.school = user.university;
          info.year = user.graduationYear;
        } else if (visibilityLevel === "school") {
          info.role = user.fieldsOfInterest[0];
          info.school = user.university;
          info.year = user.graduationYear;
        } else if (visibilityLevel === "role") {
          info.role = user.fieldsOfInterest[0];
        }

        return info;
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        visibilityLevel: state.visibilityLevel,
      }),
    }
  )
);

// Helper selector for isAnonymous
export const useIsAnonymous = () => useAuthStore((state) => state.visibilityLevel === "anonymous");
