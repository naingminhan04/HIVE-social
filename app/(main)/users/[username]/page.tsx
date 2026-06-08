"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Profile from "@/app/_components/profile/Profile";
import { useAuthStore } from "@/store/auth";
import { usePortalBarVisible } from "@/hooks/usePortalBarVisible";

const UserProfilePage = () => {
  const router = useRouter();
  const params = useParams<{ username: string | string[] }>();
  const viewer = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isSessionChecking = useAuthStore((state) => state.isSessionChecking);
  const isPortalBarVisible = usePortalBarVisible();
  const hasHandledOwnProfile = useRef(false);
  const routeUsername = Array.isArray(params.username)
    ? params.username[0]
    : params.username;
  const username = routeUsername?.trim() ?? "";
  const isOwnProfile = viewer?.username === username || viewer?.id === username;
  const isAuthResolved = hasHydrated && !isSessionChecking;

  useEffect(() => {
    if (
      !isAuthResolved ||
      !isPortalBarVisible ||
      !isOwnProfile ||
      hasHandledOwnProfile.current
    ) {
      return;
    }

    hasHandledOwnProfile.current = true;

    const fallbackTimeout = window.setTimeout(() => {
      router.replace("/home");
    }, 250);

    if (window.history.length > 1) {
      window.history.back();
      return () => window.clearTimeout(fallbackTimeout);
    }

    router.replace("/home");
    return () => window.clearTimeout(fallbackTimeout);
  }, [isAuthResolved, isOwnProfile, isPortalBarVisible, router]);

  if (isPortalBarVisible && !isAuthResolved) {
    return null;
  }

  if (isPortalBarVisible && isOwnProfile) {
    return null;
  }

  if (!username) {
    return (
      <div className="flex min-h-[calc(100dvh-60px)] items-center justify-center p-4 text-sm text-red-500 lg:min-h-dvh">
        Invalid profile username.
      </div>
    );
  }

  return (
    <div className="md:px-2">
      <Profile username={username} />
    </div>
  );
};

export default UserProfilePage;
