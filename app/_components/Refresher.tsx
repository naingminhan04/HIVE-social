import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth";
import { UserType } from "@/types/user";

const UserRefresher = () => {
  const hasCheckedSession = useRef(false);
  const {
    hasHydrated,
    setHasHydrated,
    setIsSessionChecking,
    setUser,
    logOut,
  } = useAuthStore();

  useEffect(() => {
    setHasHydrated(true);
  }, [setHasHydrated]);

  useEffect(() => {
    if (!hasHydrated || hasCheckedSession.current) return;

    let cancelled = false;
    hasCheckedSession.current = true;
    setIsSessionChecking(true);

    (async () => {
      try {
        const response = await fetch("/api/session", {
          method: "GET",
          cache: "no-store",
        });
        const result = (await response.json()) as {
          success: boolean;
          data?: { user?: UserType | null };
        };

        if (cancelled) return;

        if (response.ok && result.success && result.data?.user) {
          setUser(result.data.user);
        } else {
          logOut();
        }
      } catch {
        if (!cancelled) logOut();
      } finally {
        if (!cancelled) {
          setIsSessionChecking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, logOut, setIsSessionChecking, setUser]);
  return null;
};

export default UserRefresher;
