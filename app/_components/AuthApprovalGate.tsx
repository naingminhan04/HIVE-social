"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { useAuthStore } from "@/store/auth";

const AuthApprovalGate = () => {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isSessionChecking = useAuthStore((state) => state.isSessionChecking);

  useEffect(() => {
    if (!hasHydrated || isSessionChecking) return;

    if (!user) {
      router.replace("/");
      return;
    }

    if (!user.isVerified && pathname !== "/verify") {
      router.replace("/verify");
    }
  }, [hasHydrated, isSessionChecking, pathname, router, user]);

  if (!hasHydrated || isSessionChecking || !user || !user.isVerified) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-100 p-5 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-neutral-100" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Checking your account...
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthApprovalGate;
