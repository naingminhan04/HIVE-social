import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { refreshAction } from "@/app/_actions/refresh";

const UserRefresher = () => {
  const pathname = usePathname();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const setIsSessionChecking = useAuthStore((state) => state.setIsSessionChecking);
  const setUser = useAuthStore((state) => state.setUser);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const logOut = useAuthStore((state) => state.logOut);
  const hasCheckedSessionRef = useRef(false);

  useEffect(() => {
    const markHydrated = () => useAuthStore.setState({ hasHydrated: true });

    const unsubscribe = useAuthStore.persist.onFinishHydration(markHydrated);

    if (useAuthStore.persist.hasHydrated()) {
      markHydrated();
    }

    const fallback = window.setTimeout(markHydrated, 500);

    return () => {
      unsubscribe();
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    if (pathname === "/" || pathname === "/signup" || pathname === "/verify") {
      setIsSessionChecking(false);
      return;
    }

    if (hasCheckedSessionRef.current) {
      setIsSessionChecking(false);
      return;
    }

    let cancelled = false;
    const currentUser = useAuthStore.getState().user;
    hasCheckedSessionRef.current = true;
    setIsSessionChecking(!currentUser);

    (async () => {
      try {
        const result = await refreshAction();

        if (cancelled) return;

        if (result.success && result.data?.user) {
          setUser(result.data.user);
          if (result.data.accessToken) {
            setAccessToken(result.data.accessToken);
          }
        } else {
          logOut();
        }
      } catch {
        if (!cancelled) {
          logOut();
        }
      } finally {
        if (!cancelled) {
          setIsSessionChecking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, logOut, pathname, setIsSessionChecking, setUser, setAccessToken]);

  return null;
};

export default UserRefresher;
