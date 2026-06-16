"use client";

import { getChatsAction } from "@/app/_actions/chat";
import { useAuthStore } from "@/store/auth";
import { getUnreadChatsCount, visibleChatHasMessage } from "@/utils/chatDisplay";
import { useQuery } from "@tanstack/react-query";

export function useUnreadChatsCount() {
  const viewerId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: ["chatUnreadCount"],
    queryFn: async () => {
      const result = await getChatsAction();

      if (!result.success) {
        throw new Error(result.error);
      }

      return getUnreadChatsCount(
        result.data.chats.filter(visibleChatHasMessage),
        viewerId,
      );
    },
    enabled: Boolean(viewerId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
}
