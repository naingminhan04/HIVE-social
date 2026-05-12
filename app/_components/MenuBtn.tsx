"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import LogOutBtn from "./LogOutBtn";
import { getMenuArr } from "./SideBar";
import { ThemeToggle } from "./ThemeToggle";
import { useAuthStore } from "@/store/auth";
import Image from "next/image";
import { usePortalBarVisible } from "@/hooks/usePortalBarVisible";

const MenuBtn = () => {
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isPortalBarVisible = usePortalBarVisible();
  const username = user?.username;
  const MenuArr = getMenuArr(username as string).filter(
    (item) => !isPortalBarVisible || item.name !== "Profile",
  );
  
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
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.name}
                    onClick={() => setMenu(false)}
                    className={`p-4 transition-all active:bg-gray-200 ${isActive
                    ? "bg-gray-300 dark:bg-neutral-800 text-black dark:text-white"
                    : "hover:bg-gray-200 dark:hover:bg-neutral-900 active:bg-gray-300 dark:active:bg-neutral-800"}`}
                    href={item.href}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </ul>

            <div className="mt-auto space-y-2 p-2 pb-0">
              {user && (
                <div
                  onClick={() => {
                    if (!isPortalBarVisible) {
                      router.push(`/users/${user.username}`);
                    }
                    setMenu(false);
                  }}
                  className={`rounded-xl overflow-hidden border border-blue-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 ${
                    isPortalBarVisible ? "" : "cursor-pointer"
                  }`}
                >
                  <div className="relative h-20 bg-gray-200 dark:bg-neutral-800">
                    {user.coverPic && (
                      <Image
                        src={user.coverPic}
                        alt="Cover"
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-2 mt-0">
                      <Image
                        src={user.profilePic || "/default-avatar.png"}
                        alt={user.name}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full border-2 border-white dark:border-neutral-900 bg-gray-300 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{user.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          @{user.username}
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
