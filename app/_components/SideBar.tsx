"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import LogOutBtn from "./LogOutBtn";
import { ThemeToggle } from "./ThemeToggle";
import { useAuthStore } from "@/store/auth";
import HomeRefreshLink from "./HomeRefreshLink";
import RecoverableImage from "./RecoverableImage";
import { UserType } from "@/types/user";

export const getProfileSlug = (user?: Pick<UserType, "id" | "username"> | null) =>
  user?.username?.trim() || user?.id || "";

export const getMenuArr = (profileSlug: string) => [
  {
    name: "Home",
    href: "/home",
  },
  {
    name: "Chatrooms",
    href: "/chatroom",
  },
  {
    name: "Chat",
    href: "/chat",
  },
  {
    name: "Profile",
    href: profileSlug ? `/users/${profileSlug}` : "/home",
  },
  {
    name: "Leaderboard",
    href: "/leaderboard",
  },
];
const SideBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const profileSlug = getProfileSlug(user);
  const MenuArr = getMenuArr(profileSlug).filter((item) => item.name !== "Profile");

  return (
    <div className="hidden lg:flex w-9/10 h-full flex-col">
      <ul className="cursor-pointer flex w-full flex-1 flex-col">
        {MenuArr.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            item.href === "/home" ? (
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
                {item.name}
              </Link>
            )
          );
        })}
      </ul>

      <div className="mt-auto space-y-3">
        {user && (
          <div
            onClick={() => {
              router.push(`/users/${getProfileSlug(user)}`);
            }}
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
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-full border-2 border-white dark:border-neutral-900 bg-gray-300 object-cover"
                  wrapperClassName="h-14 w-14 shrink-0 rounded-full"
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

        <div className="flex justify-center bg-blue-100 dark:bg-neutral-800 p-2 -mx-3">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};

export default SideBar;
