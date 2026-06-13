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
    <main className="min-h-[calc(100dvh-60px)] lg:min-h-dvh">
      <div className="sticky top-15 lg:top-0 z-20 border-b border-blue-200/80 bg-linear-to-r from-blue-100 to-blue-50 p-4 dark:border-neutral-800 dark:from-neutral-950 dark:to-neutral-900">
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-blue-600 dark:text-blue-400" />
          <h1 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            Notifications
          </h1>
        </div>
      </div>

      {notificationsQuery.error ? (
        <div className="p-4 text-red-600 dark:text-red-400">
          {(notificationsQuery.error as Error).message}
        </div>
      ) : null}

      {showInitialLoading ? (
        <div className="space-y-2 p-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="h-11 w-11 rounded-full bg-gray-200 dark:bg-neutral-700" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-neutral-700" />
                <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-neutral-700" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 p-10 text-center text-gray-500 dark:text-gray-400">
          <Bell size={40} className="opacity-40" />
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-2">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => handleNotificationClick(notification)}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                notification.isRead
                  ? "border-gray-200 bg-white hover:bg-blue-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                  : "border-blue-200 bg-blue-50/80 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:hover:bg-blue-500/15"
              }`}
            >
              <RecoverableImage
                src={notification.actorUser?.profilePic || "/default-avatar.png"}
                alt={notification.actorUser?.name || "Notification"}
                width={44}
                height={44}
                className="h-11 w-11 rounded-full object-cover"
                wrapperClassName="h-11 w-11 shrink-0 rounded-full"
                fallbackSrc="/default-avatar.png"
              />
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm ${
                    notification.isRead
                      ? "text-neutral-700 dark:text-neutral-200"
                      : "font-semibold text-neutral-900 dark:text-neutral-50"
                  }`}
                >
                  {notification.text || "You have a new notification"}
                </span>
                <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">
                  {formatDate(notification.createdAt, false, true)}
                </span>
              </span>
              {!notification.isRead ? (
                <span
                  className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500"
                  aria-hidden
                />
              ) : null}
            </button>
          ))}

          {notificationsQuery.hasNextPage ? (
            <div ref={loadMoreRef} className="h-2 w-full" />
          ) : null}

          {notificationsQuery.isFetchingNextPage ? (
            <div className="py-3 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Loading more...
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
};

export default NotificationsPage;
