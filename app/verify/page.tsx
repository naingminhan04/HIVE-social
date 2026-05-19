"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";
import { Clock3, LogOut, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth";
import { logoutAction } from "../_actions/logout";
import { ensurePendingAuthContextAction } from "../_actions/ensurePendingAuthContext";
import { checkAccountStatusAction } from "../_actions/checkAccountStatus";
import { useAuthLoading, useAuthResolved } from "@/hooks/useAuthResolved";
import type { PendingAuthMethod } from "@/types/auth";

const Verify = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logOut = useAuthStore((state) => state.logOut);
  const isAuthResolved = useAuthResolved();
  const isAuthLoading = useAuthLoading();
  const [email, setEmail] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<PendingAuthMethod | null>(null);
  const [hasRefreshToken, setHasRefreshToken] = useState(false);
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const [hasPendingGoogleIdToken, setHasPendingGoogleIdToken] = useState(false);
  const [password, setPassword] = useState("");
  const [hasCheckedVerificationState, setHasCheckedVerificationState] =
    useState(false);
  const hasResolvedRef = useRef(false);
  const hasAutoCheckedRef = useRef(false);

  useEffect(() => {
    if (!isAuthResolved || hasResolvedRef.current) return;

    let cancelled = false;

    const resolveVerificationState = async () => {
      try {
        const currentUser = useAuthStore.getState().user;
        const status = await ensurePendingAuthContextAction(
          currentUser
            ? {
                googleId: currentUser.googleId,
                hasPassword: currentUser.hasPassword,
              }
            : null,
        );
        if (cancelled) return;

        setEmail(currentUser?.email ?? status.pendingEmail);
        setAuthMethod(
          status.authMethod ??
            (currentUser?.googleId ? "google" : currentUser?.hasPassword ? "email" : "google"),
        );
        setHasRefreshToken(status.hasRefreshToken);
        setHasAccessToken(status.hasAccessToken);
        setHasPendingGoogleIdToken(status.hasPendingGoogleIdToken);
      } catch {
        if (!cancelled) {
          setEmail(null);
          setAuthMethod(null);
          setHasRefreshToken(false);
          setHasAccessToken(false);
          setHasPendingGoogleIdToken(false);
        }
      } finally {
        if (!cancelled) {
          hasResolvedRef.current = true;
          setHasCheckedVerificationState(true);
        }
      }
    };

    void resolveVerificationState();

    return () => {
      cancelled = true;
    };
  }, [isAuthResolved]);

  const handleStatusResult = useCallback((
    result: Awaited<ReturnType<typeof checkAccountStatusAction>>,
    options?: { silentPending?: boolean },
  ) => {
    if (!result.success) {
      toast.error(
        result.error ?? "Could not check your status. Please try again.",
      );
      return;
    }

    setUser(result.data.user);

    if (result.data.user.isVerified) {
      toast.success("Your account has been approved!");
      router.replace("/home");
      return;
    }

    if (!options?.silentPending) {
      toast("Still waiting for admin approval.", { icon: "⏳" });
    }
  }, [router, setUser]);

  const checkStatusMutation = useMutation({
    mutationFn: () =>
      checkAccountStatusAction({
        userId: user?.id,
        email: email ?? undefined,
        password: password || undefined,
      }),
    onSuccess: (result) => handleStatusResult(result),
    onError: () => {
      toast.error("Could not check your status. Please try again.");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutAction,
    onSettled: () => {
      logOut();
      router.replace("/");
    },
  });

  const isGooglePending = authMethod !== "email";
  const isEmailPending = authMethod === "email";
  const hasSession = hasRefreshToken || hasAccessToken;
  const showSessionCheck = hasSession || (isGooglePending && hasPendingGoogleIdToken);
  const showPasswordRecheck = isEmailPending;

  useEffect(() => {
    if (!hasCheckedVerificationState || !showSessionCheck || hasAutoCheckedRef.current) {
      return;
    }

    hasAutoCheckedRef.current = true;

    void checkAccountStatusAction({
      userId: user?.id,
      email: email ?? undefined,
    }).then((result) => {
      handleStatusResult(result, { silentPending: true });
    });
  }, [email, handleStatusResult, hasCheckedVerificationState, showSessionCheck, user?.id]);

  if (isAuthLoading || !hasCheckedVerificationState) {
    return (
      <main className="flex min-h-dvh w-dvw items-center justify-center p-5">
        <LoadingState />
      </main>
    );
  }

  if (!email) {
    return (
      <main className="flex min-h-dvh w-dvw items-center justify-center p-5">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No pending account found. Sign in to continue.
          </p>
          <Link
            href="/"
            className="rounded-md bg-neutral-900 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    );
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
              Account under review
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              {user?.name ? (
                <>
                  Hi <b className="text-neutral-900 dark:text-neutral-100">{user.name}</b>,{" "}
                </>
              ) : null}
              an admin is reviewing your account for{" "}
              <b className="text-neutral-900 dark:text-neutral-100">{email}</b>. You will be
              able to access the app once it has been approved.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          {showPasswordRecheck ? (
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              className="w-full rounded-md border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:focus:border-neutral-100"
            />
          ) : null}

          {showSessionCheck || showPasswordRecheck ? (
            <button
              type="button"
              onClick={() => checkStatusMutation.mutate()}
              disabled={
                checkStatusMutation.isPending ||
                (showPasswordRecheck && !password.trim() && !showSessionCheck)
              }
              className="inline-flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100"
            >
              <RefreshCw
                size={16}
                className={checkStatusMutation.isPending ? "animate-spin" : undefined}
              />
              {checkStatusMutation.isPending ? "Checking..." : "Check status"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-900"
          >
            <LogOut size={16} />
            {logoutMutation.isPending ? "Signing out..." : "Log out"}
          </button>
        </div>

        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {isGooglePending
            ? showSessionCheck
              ? "Use Check status to see if your account has been approved."
              : "Your account is still waiting for admin approval. Please sign in again later to refresh your status."
            : "Use another account? Log out, then sign in with a different email or password."}
        </p>
      </div>
    </main>
  );
};

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-neutral-100" />
      <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading...</p>
    </div>
  );
}

export default Verify;
