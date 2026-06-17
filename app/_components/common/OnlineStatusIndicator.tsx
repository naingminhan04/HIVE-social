"use client";

import { useEffect } from "react";
import { useUserPresence } from "@/hooks/useUserPresence";

type OnlineStatusIndicatorProps = {
  userId: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export default function OnlineStatusIndicator({
  userId,
  size = "md",
}: OnlineStatusIndicatorProps) {
  const { onlineUserIds, statuses, requestUserStatus } = useUserPresence();
  const isOnline = onlineUserIds.has(userId) || statuses[userId]?.isOnline;

  useEffect(() => {
    if (!statuses[userId]) {
      requestUserStatus(userId);
    }
  }, [userId, statuses, requestUserStatus]);

  return (
    <span
      className={`absolute bottom-1 right-1 block rounded-full ring-2 ring-white dark:ring-neutral-900 z-10 ${
        sizeClasses[size]
      } ${isOnline ? "bg-green-500" : "bg-neutral-400"}`}
    />
  );
}