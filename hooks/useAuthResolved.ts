import { useAuthStore } from "@/store/auth";

export const useAuthResolved = () => {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isSessionChecking = useAuthStore((state) => state.isSessionChecking);

  return hasHydrated && !isSessionChecking;
};

export const useAuthLoading = () => {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isSessionChecking = useAuthStore((state) => state.isSessionChecking);

  return !hasHydrated || isSessionChecking;
};
