"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import LogOutBtn from "../auth/LogOutBtn";
import { ThemeToggle } from "./ThemeToggle";
import { useAuthStore } from "@/store/auth";
import HomeRefreshLink from "./HomeRefreshLink";
import RecoverableImage from "../common/RecoverableImage";
import { UserType } from "@/types/user";
import { useQuery } from "@tanstack/react-query";
import { getUnreadNotificationCountAction } from "@/app/_actions/notification";
import { useUnreadChatsCount } from "@/hooks/useUnreadChatsCount";

export const getProfileSlug = (
  user?: Pick<UserType, "id" | "username"> | null,
) => user?.username?.trim() || user?.id || "";

export const getMenuArr = (profileSlug: string) => [
  {
    name: "Home",
    href: "/home",
  },
  {
    name: "Chat",
    href: "/chat",
  },
  {
    name: "Leaderboard",
    href: "/leaderboard",
  },
  {
    name: "Notifications",
    href: "/notifications",
  },
  {
    name: "Points",
    href: "/points",
  },
  {
    name: "Profile",
    href: profileSlug ? `/users/${profileSlug}` : "/home",
  },
];
const SideBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const profileSlug = getProfileSlug(user);
  const MenuArr = getMenuArr(profileSlug).filter(
    (item) => item.name !== "Profile",
  );
  const openProfile = () => {
    if (window.innerWidth >= 768) return;
    router.push(`/users/${getProfileSlug(user)}`);
  };

  const { data: unreadCountData } = useUnreadChatsCount();

  const { data: notificationUnreadCountData } = useQuery({
    queryKey: ["notificationUnreadCount"],
    queryFn: async () => {
      const result = await getUnreadNotificationCountAction();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data.totalUnreadCount;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const unreadCount = unreadCountData ?? 0;
  const notificationUnreadCount = notificationUnreadCountData ?? 0;

  return (
    <div className="hidden lg:flex w-9/10 h-full flex-col">
      <ul className="cursor-pointer flex w-full flex-1 flex-col">
        {MenuArr.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return item.href === "/home" ? (
            <HomeRefreshLink
              key={item.name}
              className={`block rounded-md p-4 transition-colors ${
                isActive
                  ? "bg-blue-400 dark:bg-black"
                  : "hover:bg-blue-300 dark:hover:bg-neutral-950 active:bg-blue-400 dark:active:bg-black"
              }`}
            >
              {item.name}
            </HomeRefreshLink>
          ) : (
            <Link
              key={item.name}
              className={`p-4 rounded-md transition-colors ${
                isActive
                  ? "bg-blue-400 dark:bg-black"
                  : "hover:bg-blue-300 dark:hover:bg-neutral-950 active:bg-blue-400 dark:active:bg-black"
              }`}
              href={item.href}
            >
              <div className="flex items-center justify-between">
                <span>{item.name}</span>

                {item.name === "Chat" && unreadCount > 0 && (
                  <span className="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-neutral-950 dark:text-neutral-100">
                    {unreadCount}
                  </span>
                )}
                {item.name === "Notifications" && notificationUnreadCount > 0 && (
                  <span className="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-neutral-950 dark:text-neutral-100">
                    {notificationUnreadCount}
                  </span>
                )}
                {item.name === "Points" && (
                  <span className="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-neutral-950 dark:text-neutral-100">
                    {user?.points ?? 0}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </ul>

      <div className="mt-auto space-y-3">
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
                  sizes="18rem"
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
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-full border-2 border-white dark:border-neutral-900 bg-gray-300 object-cover"
                  wrapperClassName="h-14 w-14 shrink-0 rounded-full"
                  fallbackSrc="/default-avatar.png"
                  showRetryButton
                  retryButtonClassName="h-8 w-8"
                  userId={user.id}
                  showOnlineStatus={true}
                  onlineStatusSize="md"
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

        <div className="flex justify-center bg-blue-100 dark:bg-neutral-800 p-2 -mx-3">
          <ThemeToggle />
        </div>
      </div>

    </div>
  );
};

export default SideBar;
