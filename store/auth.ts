import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserType } from "@/types/user";

interface AuthState {
  user: UserType | null;
  hasHydrated: boolean;
  isSessionChecking: boolean;
  setUser: (user: UserType | null) => void;
  setHasHydrated: (value: boolean) => void;
  setIsSessionChecking: (value: boolean) => void;
  logOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hasHydrated: false,
      isSessionChecking: true,

      setUser: (user) => set({ user }),

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      setIsSessionChecking: (isSessionChecking) => set({ isSessionChecking }),

      logOut: () => set({ user: null }),
    }),
    {
      name: "auth-store",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
