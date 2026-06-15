"use client";

import { resetUnreadMessagesCountAction } from "@/app/_actions/chat";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export function useResetChatUnreadCount() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.setQueryData(["chatUnreadCount"], 0);

    void resetUnreadMessagesCountAction().then((result) => {
      if (result.success) {
        queryClient.setQueryData(
          ["chatUnreadCount"],
          result.data.unreadMessagesCount,
        );
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["chatUnreadCount"] });
    });
  }, [queryClient]);
}
