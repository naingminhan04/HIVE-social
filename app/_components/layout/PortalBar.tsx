"use client";

import { useAuthStore } from "@/store/auth";
import DummyProfile from "../common/DummyProfile";
import Profile from "../profile/Profile";

const PortalBar = () => {
  const user = useAuthStore((state) => state.user);
  const isSessionChecking = useAuthStore((state) => state.isSessionChecking);
  const username = user?.username?.trim();

  return (
    <aside className="hidden md:block md:w-2/5">
      <div className="sticky top-15 right-0 bottom-0 h-[calc(100dvh-60px)] lg:top-0 lg:h-dvh">
        <div
          id="portal-scroll-container"
          data-home-scroll-target="true"
          className="h-full overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-none"
        >
          {user && username ? (
            <Profile username={username} isPortal />
          ) : isSessionChecking ? (
            <DummyProfile isPortal />
          ) : (
            <div className="flex h-full items-center justify-center bg-white p-6 text-center text-sm text-gray-500 dark:bg-neutral-900 dark:text-gray-400">
              Sign in to view your profile here.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default PortalBar;
