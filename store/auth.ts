import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserType } from "@/types/user";

interface AuthState {
  user: UserType | null;
  accessToken: string | null;
  hasHydrated: boolean;
  isSessionChecking: boolean;
  setUser: (user: UserType | null) => void;
  setAccessToken: (token: string | null) => void;
  setHasHydrated: (value: boolean) => void;
  setIsSessionChecking: (value: boolean) => void;
  logOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      hasHydrated: false,
      isSessionChecking: true,

      setUser: (user) =>
        set((state) => (state.user === user ? state : { user })),

      setAccessToken: (token) =>
        set((state) => (state.accessToken === token ? state : { accessToken: token })),

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

      logOut: () => set((state) => (state.user === null && state.accessToken === null ? state : { user: null, accessToken: null })),
    }),
    {
      name: "auth-store",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
