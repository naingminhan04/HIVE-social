"use client";

import {
  getNotificationsAction,
  markNotificationReadAction,
} from "@/app/_actions/notification";
import RecoverableImage from "@/app/_components/common/RecoverableImage";
import type { NotificationItem } from "@/types/notification";
import { formatDate } from "@/utils/formatDate";
import { getNotificationHref } from "@/utils/notification";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useRef } from "react";

const PAGE_SIZE = 15;

const NotificationsPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const notificationsQuery = useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: async ({ pageParam = 1 }) => {
      const result = await getNotificationsAction(pageParam, PAGE_SIZE);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.metadata.nextPage ?? undefined,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const result = await markNotificationReadAction(notificationId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notificationUnreadCount"] });
    },
  });

  const notifications =
    notificationsQuery.data?.pages.flatMap((page) => page.data) ?? [];

  useEffect(() => {
    if (!notificationsQuery.isSuccess) return;
    void queryClient.invalidateQueries({ queryKey: ["notificationUnreadCount"] });
  }, [notificationsQuery.isSuccess, queryClient]);

  useEffect(() => {
    if (!loadMoreRef.current || !notificationsQuery.hasNextPage) return;
    if (notificationsQuery.isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          void notificationsQuery.fetchNextPage();
        }
      },
      { root: null, rootMargin: "120px" },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [
    notificationsQuery.fetchNextPage,
    notificationsQuery.hasNextPage,
    notificationsQuery.isFetchingNextPage,
  ]);

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }

    const href = getNotificationHref(notification);
    if (href) {
      router.push(href);
    }
  };

  const showInitialLoading =
    notificationsQuery.isLoading && notifications.length === 0;

  return (
    <main className="flex h-[calc(100dvh-60px)] w-full flex-col gap-2 overflow-y-auto p-2 overscroll-contain scrollbar-none lg:h-dvh">
      <div className="shrink-0 rounded-xl border-2 border-white bg-white px-4 py-4 dark:border-neutral-900 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-400 text-white dark:bg-white dark:text-black">
            <Bell size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-neutral-50">
              Notifications
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Stay up to date with your hive
            </p>
          </div>
        </div>
      </div>

      {notificationsQuery.error ? (
        <div className="rounded-xl border-2 border-white bg-white p-4 text-sm text-red-600 dark:border-neutral-900 dark:bg-neutral-900 dark:text-red-400">
          {(notificationsQuery.error as Error).message}
        </div>
      ) : null}

      {showInitialLoading ? (
        <>
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex animate-pulse items-start gap-3 rounded-xl border-2 border-white bg-white p-4 dark:border-neutral-900 dark:bg-neutral-900"
            >
              <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-neutral-700" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-neutral-700" />
                <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-neutral-700" />
              </div>
            </div>
          ))}
        </>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-white bg-white px-6 py-16 text-center dark:border-neutral-900 dark:bg-neutral-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-500 dark:bg-blue-500/10 dark:text-blue-300">
            <Bell size={24} />
          </div>
          <div>
            <p className="text-base font-medium text-neutral-800 dark:text-neutral-100">
              No notifications yet
            </p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              When something happens, you will see it here.
            </p>
          </div>
        </div>
      ) : (
        <>
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => handleNotificationClick(notification)}
              className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition ${
                notification.isRead
                  ? "border-white bg-white hover:bg-blue-100 dark:border-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                  : "border-blue-100 bg-blue-50/80 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:hover:bg-blue-500/15"
              }`}
            >
              <div className="relative shrink-0">
                <RecoverableImage
                  src={notification.actorUser?.profilePic || "/default-avatar.png"}
                  alt={notification.actorUser?.name || "Notification"}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                  wrapperClassName="h-12 w-12 shrink-0 rounded-full"
                  fallbackSrc="/default-avatar.png"
                />
                {!notification.isRead ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-blue-500 dark:border-neutral-900"
                    aria-hidden
                  />
                ) : null}
              </div>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm leading-relaxed ${
                    notification.isRead
                      ? "text-neutral-700 dark:text-neutral-200"
                      : "font-semibold text-neutral-900 dark:text-neutral-50"
                  }`}
                >
                  {notification.text || "You have a new notification"}
                </span>
                <span className="mt-1.5 block text-xs text-neutral-500 dark:text-neutral-400">
                  {formatDate(notification.createdAt, false, true)}
                </span>
              </span>
            </button>
          ))}

          {notificationsQuery.hasNextPage ? (
            <div ref={loadMoreRef} className="h-2 w-full" />
          ) : null}

          {notificationsQuery.isFetchingNextPage ? (
            <div className="rounded-xl border-2 border-white bg-white py-4 text-center text-sm text-neutral-500 dark:border-neutral-900 dark:bg-neutral-900 dark:text-neutral-400">
              Loading more...
            </div>
          ) : null}
        </>
      )}
    </main>
  );
};

export default NotificationsPage;
