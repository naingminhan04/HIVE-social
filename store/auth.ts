import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserType } from "@/types/user";

interface AuthState {
  tmpVerificationCode: number | null;
  user: UserType | null;
  hasHydrated: boolean;
  isSessionChecking: boolean;
  setTmpVerificationCode: (code: number | null) => void;
  setUser: (user: UserType | null) => void;
  setHasHydrated: (value: boolean) => void;
  setIsSessionChecking: (value: boolean) => void;
  logOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      tmpVerificationCode: null,
      user: null,
      hasHydrated: false,
      isSessionChecking: true,

      setTmpVerificationCode: (tmpVerificationCode) =>
        set({ tmpVerificationCode }),

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
