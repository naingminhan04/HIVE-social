"use client";

import { useChatNavigation } from "@/app/_components/chat/ChatNavigation";
import type { ReactNode } from "react";

type ChatPageShellProps = {
  children: ReactNode;
};

const ChatPageShell = ({ children }: ChatPageShellProps) => {
  const { showPanel } = useChatNavigation();

  return (
    <main
      className={`relative flex h-[calc(100dvh-60px)] w-full flex-col gap-2 p-2 text-neutral-900 lg:h-dvh dark:text-neutral-50 ${
        showPanel
          ? "overflow-hidden"
          : "overflow-y-auto overscroll-contain scrollbar-none"
      }`}
    >
      <div id="chat-overlay-root" className="pointer-events-none absolute inset-0 z-30" />
      {children}
    </main>
  );
};

export default ChatPageShell;
