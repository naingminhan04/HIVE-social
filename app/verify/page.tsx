"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";
import { CheckCircle2, Clock3, LogOut, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { UserType } from "@/types/user";
import { logoutAction } from "../_actions/logout";

const Verify = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isSessionChecking = useAuthStore((state) => state.isSessionChecking);
  const setUser = useAuthStore((state) => state.setUser);
  const logOut = useAuthStore((state) => state.logOut);
  const isAuthResolved = hasHydrated && !isSessionChecking;

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/session", {
        method: "GET",
        cache: "no-store",
      });
      const result = (await response.json()) as {
        success: boolean;
        data?: { user?: UserType | null };
        error?: string;
      };

      if (!response.ok || !result.success || !result.data?.user) {
        throw new Error(result.error || "Could not refresh your approval status.");
      }

      return result.data.user;
    },
    onSuccess: (nextUser) => {
      setUser(nextUser);
      if (nextUser.isVerified) {
        router.replace("/home");
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutAction,
    onSettled: () => {
      logOut();
      router.replace("/");
    },
  });

  useEffect(() => {
    if (!isAuthResolved) return;

    if (!user) {
      router.replace("/signup");
      return;
    }

    if (user.isVerified) {
      router.replace("/home");
    }
  }, [isAuthResolved, router, user]);

  if (!isAuthResolved) {
    return (
      <main className="flex min-h-dvh w-dvw items-center justify-center p-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-neutral-100" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Checking your account...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  if (user.isVerified) {
    return null;
  }

  return (
    <main className="flex min-h-dvh w-dvw flex-col items-center justify-center p-5">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <Image
          src="/sea-logo.jpg"
          alt="Star Education Academy Logo"
          width={96}
          height={96}
          className="rounded-full"
        />

        <div className="flex flex-col items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            <Clock3 size={24} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-neutral-950 dark:text-neutral-50">
              Waiting for admin approval
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              Your Google account is signed in as{" "}
              <b className="text-neutral-900 dark:text-neutral-100">{user.email}</b>.
              An admin needs to approve it before you can access SEA Social.
            </p>
          </div>
        </div>

        {refreshMutation.data?.isVerified ? (
          <div className="flex items-center gap-2 rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 size={16} />
            Approved. Taking you home...
          </div>
        ) : null}

        {refreshMutation.isError ? (
          <p className="text-sm text-red-600 dark:text-red-500">
            {refreshMutation.error.message}
          </p>
        ) : null}

        <div className="flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-3 font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
          >
            <RefreshCw
              size={18}
              className={refreshMutation.isPending ? "animate-spin" : ""}
            />
            {refreshMutation.isPending ? "Checking..." : "Check approval status"}
          </button>
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-black/10 px-4 py-3 font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-60 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            <LogOut size={18} />
            {logoutMutation.isPending ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </div>
    </main>
  );
};

export default Verify;
