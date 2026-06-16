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
    <main
      className="relative flex h-[calc(100dvh-60px)] w-full min-w-0 max-w-full flex-col gap-1 overflow-hidden p-2 text-neutral-900 lg:h-dvh dark:text-neutral-50"
    >
      {children}
      <div
        id="chat-overlay-root"
        className="pointer-events-none absolute inset-0 z-20"
      />
    </main>
  );
};

export default ChatPageShell;
