"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import LogOutBtn from "../auth/LogOutBtn";
import { getMenuArr, getProfileSlug } from "./SideBar";
import { ThemeToggle } from "./ThemeToggle";
import { useAuthStore } from "@/store/auth";
import HomeRefreshLink from "./HomeRefreshLink";
import RecoverableImage from "../common/RecoverableImage";
import { useQuery } from "@tanstack/react-query";
import { getUnreadMessagesCountAction } from "@/app/_actions/chat";

const MenuBtn = () => {
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const profileSlug = getProfileSlug(user);
  const MenuArr = getMenuArr(profileSlug);
  const openProfile = () => {
    setMenu(false);
    if (window.innerWidth >= 768) return;
    router.push(`/users/${getProfileSlug(user)}`);
  };

  const { data: unreadCountData } = useQuery({
    queryKey: ["chatUnreadCount"],
    queryFn: async () => {
      const result = await getUnreadMessagesCountAction();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data.unreadMessagesCount;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const unreadCount = unreadCountData ?? 0;

  return (
    <div className="flex lg:hidden">
      <button
        onClick={() => setMenu(!menu)}
        className={
          "rounded-md p-2 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 " +
          "active:scale-90 flex justify-center items-center transition-all"
        }
      >
        {menu ? <X /> : <Menu />}
      </button>
      {menu && (
        <>
          <div
            className="fixed inset-0 -z-20 bg-black/40 backdrop-blur-sm"
            onClick={() => setMenu(false)}
          />
          <div className="absolute flex flex-col top-15 left-0 h-[calc(100dvh-60px)] w-70 z-20 bg-white dark:bg-neutral-900">
            <ul className="cursor-pointer overflow-scroll scrollbar-none overscroll-contain flex flex-1 flex-col">
              {MenuArr.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                const profileVisibilityClass =
                  item.name === "Profile" ? "md:hidden" : "";
                return item.href === "/home" ? (
                  <HomeRefreshLink
                    key={item.name}
                    onNavigate={() => setMenu(false)}
                    className={`block p-4 transition-all active:bg-gray-200 ${profileVisibilityClass} ${
                      isActive
                        ? "bg-gray-300 dark:bg-neutral-800 text-black dark:text-white"
                        : "hover:bg-gray-200 dark:hover:bg-neutral-900 active:bg-gray-300 dark:active:bg-neutral-800"
                    }`}
                  >
                    {item.name}
                  </HomeRefreshLink>
                ) : (
                  <Link
                    key={item.name}
                    onClick={() => setMenu(false)}
                    className={`p-4 transition-all active:bg-gray-200 ${profileVisibilityClass} ${
                      isActive
                        ? "bg-gray-300 dark:bg-neutral-800 text-black dark:text-white"
                        : "hover:bg-gray-200 dark:hover:bg-neutral-900 active:bg-gray-300 dark:active:bg-neutral-800"
                    }`}
                    href={item.href}
                  >
                    <div className="flex items-center justify-between">
                      <span>{item.name}</span>

                      {item.name === "Chat" && unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </ul>

            <div className="mt-auto space-y-2 p-2 pb-0">
              {user && (
                <div
                  onClick={openProfile}
                  className="cursor-pointer rounded-xl overflow-hidden border border-blue-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                >
                  <div className="relative h-20 bg-gray-200 dark:bg-neutral-800">
                    {user.coverPic && (
                      <RecoverableImage
                        src={user.coverPic}
                        alt="Cover"
                        fill
                        className="object-cover"
                        wrapperClassName="h-full w-full"
                        showRetryButton
                        retryButtonClassName="h-10 w-10"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-2 mt-0">
                      <RecoverableImage
                        src={user.profilePic || "/default-avatar.png"}
                        alt={user.name}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full border-2 border-white dark:border-neutral-900 bg-gray-300 object-cover"
                        wrapperClassName="h-12 w-12 shrink-0 rounded-full"
                        fallbackSrc="/default-avatar.png"
                        showRetryButton
                        retryButtonClassName="h-8 w-8"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{user.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          @{user.username || user.email || user.id}
                        </p>
                      </div>
                    </div>
                    <div
                      className="mt-3 pt-3 border-t border-gray-200 dark:border-neutral-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <LogOutBtn className="w-full h-9 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex -mx-2 justify-center bg-blue-100 dark:bg-neutral-800 p-2">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MenuBtn;