"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";
import { Clock3, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { logoutAction } from "../_actions/logout";
import { getPendingEmailAction } from "../_actions/getPendingEmail";
import { useAuthLoading, useAuthResolved } from "@/hooks/useAuthResolved";
import VerifyCodeForm from "../_components/VerifyCodeForm";
import { UserType } from "@/types/user";

const Verify = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logOut = useAuthStore((state) => state.logOut);
  const isAuthResolved = useAuthResolved();
  const isAuthLoading = useAuthLoading();
  const [email, setEmail] = useState<string | null>(null);
  const [hasCheckedVerificationState, setHasCheckedVerificationState] =
    useState(false);

  useEffect(() => {
    if (!isAuthResolved) return;

    let cancelled = false;

    const resolveVerificationState = async () => {
      setHasCheckedVerificationState(false);

      try {
        let currentUser = useAuthStore.getState().user;

        if (!currentUser) {
          const response = await fetch("/api/session", {
            method: "GET",
            cache: "no-store",
          });
          const result = (await response.json()) as {
            success: boolean;
            data?: { user?: UserType | null };
          };

          if (response.ok && result.success && result.data?.user) {
            currentUser = result.data.user;
            setUser(currentUser);
          }
        }

        if (cancelled) return;

        if (currentUser?.isVerified) {
          router.replace("/home");
          return;
        }

        const pendingEmail = await getPendingEmailAction();

        if (cancelled) return;

        setEmail(currentUser?.email ?? pendingEmail);
      } catch {
        if (!cancelled) {
          setEmail(null);
        }
      } finally {
        if (!cancelled) {
          setHasCheckedVerificationState(true);
        }
      }
    };

    void resolveVerificationState();

    return () => {
      cancelled = true;
    };
  }, [isAuthResolved, router, setUser, user?.email, user?.id, user?.isVerified]);

  const logoutMutation = useMutation({
    mutationFn: logoutAction,
    onSettled: () => {
      logOut();
      router.replace("/");
    },
  });

  if (isAuthLoading || !hasCheckedVerificationState) {
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

  if (user?.isVerified) {
    return null;
  }

  if (!email) {
    return (
      <main className="flex min-h-dvh w-dvw items-center justify-center p-5">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No pending verification found. Sign in to continue.
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
              Verify your account
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              {user?.name ? (
                <>
                  Hi <b className="text-neutral-900 dark:text-neutral-100">{user.name}</b>,{" "}
                </>
              ) : null}
              enter the verification code for{" "}
              <b className="text-neutral-900 dark:text-neutral-100">{email}</b>. Ask an admin
              for the code if you do not have one yet.
            </p>
          </div>
        </div>

        <VerifyCodeForm email={email} />

        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Already approved by an admin?{" "}
          <Link href="/" className="font-medium underline underline-offset-2">
            Sign in again
          </Link>{" "}
          to access your account.
        </p>

        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="inline-flex items-center justify-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-800 disabled:opacity-60 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <LogOut size={16} />
          {logoutMutation.isPending ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </main>
  );
};

export default Verify;
