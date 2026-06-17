"use client";

import { createContext, useContext } from "react";

export type UserStatus = {
  userId: string;
  isOnline: boolean;
  lastSeen?: string | null;
};

export type PresenceEvent = UserStatus & {
  timestamp: string;
};

export interface UserPresenceContextType {
  onlineUserIds: Set<string>;
  statuses: Record<string, UserStatus>;
  requestUsersStatus: (userIds: string[]) => void;
  requestUserStatus: (userId: string) => void;
}

export const UserPresenceContext = createContext<UserPresenceContextType | undefined>(undefined);

export function useUserPresence() {
  const context = useContext(UserPresenceContext);
  if (!context) {
    throw new Error("useUserPresence must be used within a UserPresenceProvider");
  }
  return context;
}