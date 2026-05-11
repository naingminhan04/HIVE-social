"use client";

import { useAuthStore } from "@/store/auth";
import Profile from "./Profile";

const PortalBar = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <main className=" hidden md:block md:w-2/5 sticky top-15 lg:top-0 right-0 bottom-0 overflow-scroll overscroll-none scrollbar-none lg:h-dvh h-[calc(100dvh-64px)]">
      {user ? (
        <Profile userId={user.username} isPortal />
      ) : (
        <div className="flex h-full items-center justify-center bg-white p-6 text-center text-sm text-gray-500 dark:bg-neutral-900 dark:text-gray-400">
          Sign in to view your profile here.
        </div>
      )}
    </main>
  );
};

export default PortalBar;
