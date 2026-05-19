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

      setUser: (user) =>
        set((state) => (state.user === user ? state : { user })),

      setHasHydrated: (hasHydrated) =>
        set((state) =>
          state.hasHydrated === hasHydrated ? state : { hasHydrated },
        ),

      setIsSessionChecking: (isSessionChecking) =>
        set((state) =>
          state.isSessionChecking === isSessionChecking
            ? state
            : { isSessionChecking },
        ),

      logOut: () => set((state) => (state.user === null ? state : { user: null })),
    }),
    {
      name: "auth-store",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
