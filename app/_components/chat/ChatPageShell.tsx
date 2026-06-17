"use client";

import { useResetChatUnreadCount } from "@/hooks/useResetChatUnreadCount";
import { useEffect } from "react";
import type { ReactNode } from "react";

type ChatPageShellProps = {
  children: ReactNode;
};

const ChatPageShell = ({ children }: ChatPageShellProps) => {
  const resetChatUnreadCount = useResetChatUnreadCount();

  useEffect(() => {
    resetChatUnreadCount();
  }, [resetChatUnreadCount]);

  return (
    <div className="md:px-2">
      <main
        className="relative flex flex-col w-full min-w-0 max-w-full gap-2 text-neutral-900 dark:text-neutral-50"
      >
        {children}
        <div
          id="chat-overlay-root"
          className="pointer-events-none absolute inset-0 z-20"
        />
      </main>
    </div>
  );
};

export default ChatPageShell;
