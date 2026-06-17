"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth";
import {
  UserStatus,
  PresenceEvent,
  UserPresenceContext,
  UserPresenceContextType,
} from "@/hooks/useUserPresence";

export function UserPresenceProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const socketRef = useRef<Socket | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});

  useEffect(() => {
    if (!hasHydrated || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token: accessToken },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("get-online-users");
    });

    socket.on("online-users-list", (userIds: string[]) => {
      setOnlineUserIds(new Set(userIds));
      setStatuses((current) => {
        const next = { ...current };
        for (const userId of userIds) {
          next[userId] = { userId, isOnline: true };
        }
        return next;
      });
    });

    socket.on("user-online", (event: PresenceEvent) => {
      setOnlineUserIds((current) => new Set(current).add(event.userId));
      setStatuses((current) => ({
        ...current,
        [event.userId]: {
          userId: event.userId,
          isOnline: true,
          lastSeen: null,
        },
      }));
    });

    socket.on("user-offline", (event: PresenceEvent) => {
      setOnlineUserIds((current) => {
        const next = new Set(current);
        next.delete(event.userId);
        return next;
      });
      setStatuses((current) => ({
        ...current,
        [event.userId]: {
          userId: event.userId,
          isOnline: false,
          lastSeen: event.lastSeen,
        },
      }));
    });

    socket.on("users-status", (items: UserStatus[]) => {
      setStatuses((current) => {
        const next = { ...current };
        for (const item of items) {
          next[item.userId] = item;
        }
        return next;
      });
      setOnlineUserIds((current) => {
        const next = new Set(current);
        for (const item of items) {
          if (item.isOnline) {
            next.add(item.userId);
          } else {
            next.delete(item.userId);
          }
        }
        return next;
      });
    });

    socket.on("user-status", (item: UserStatus) => {
      setStatuses((current) => ({
        ...current,
        [item.userId]: item,
      }));
      setOnlineUserIds((current) => {
        const next = new Set(current);
        if (item.isOnline) {
          next.add(item.userId);
        } else {
          next.delete(item.userId);
        }
        return next;
      });
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("online-users-list");
      socket.off("user-online");
      socket.off("user-offline");
      socket.off("users-status");
      socket.off("user-status");
      socket.off("auth-error");
      socket.off("error");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, hasHydrated]);

  const requestUsersStatus = (userIds: string[]) => {
    socketRef.current?.emit("get-users-status", userIds);
  };

  const requestUserStatus = (userId: string) => {
    socketRef.current?.emit("get-user-status", userId);
  };

  const value: UserPresenceContextType = {
    onlineUserIds,
    statuses,
    requestUsersStatus,
    requestUserStatus,
  };

  return (
    <UserPresenceContext.Provider value={value}>
      {children}
    </UserPresenceContext.Provider>
  );
}
