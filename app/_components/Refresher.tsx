import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { UserType } from "@/types/user";

const UserRefresher = () => {
  const pathname = usePathname();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const user = useAuthStore((state) => state.user);
  const setIsSessionChecking = useAuthStore((state) => state.setIsSessionChecking);
  const setUser = useAuthStore((state) => state.setUser);
  const logOut = useAuthStore((state) => state.logOut);

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
    if (pathname === "/" || pathname === "/signup") {
      setIsSessionChecking(false);
      return;
    }
    if (pathname === "/verify" && user && !user.isVerified) {
      setIsSessionChecking(false);
      return;
    }

    const controller = new AbortController();
    setIsSessionChecking(true);

    (async () => {
      try {
        const response = await fetch("/api/session", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          success: boolean;
          data?: { user?: UserType | null };
        };

        if (controller.signal.aborted) return;

        if (response.ok && result.success && result.data?.user) {
          setUser(result.data.user);
        } else {
          logOut();
        }
      } catch {
        if (!controller.signal.aborted) {
          logOut();
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSessionChecking(false);
        }
      }
    })();

    return () => {
      controller.abort();
      setIsSessionChecking(false);
    };
  }, [hasHydrated, logOut, pathname, setIsSessionChecking, setUser, user]);

  return null;
};

export default UserRefresher;
