"use client";

import { useChatNavigation } from "@/app/_components/chat/ChatNavigation";
import type { ReactNode } from "react";

type ChatWorkspaceLayoutProps = {
  list: ReactNode;
  panel: ReactNode;
};

const ChatWorkspaceLayout = ({ list, panel }: ChatWorkspaceLayoutProps) => {
  const { showPanel } = useChatNavigation();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={`min-h-0 w-full flex-col ${
          showPanel ? "hidden" : "flex min-h-0 flex-1"
        }`}
      >
        {list}
      </div>
      <section
        className={`min-h-0 w-full flex-col overflow-hidden ${
          showPanel
            ? "flex min-h-0 flex-1 rounded-xl border-2 border-white bg-white dark:border-neutral-900 dark:bg-neutral-900"
            : "hidden"
        }`}
      >
        {panel}
      </section>
    </div>
  );
};

export default ChatWorkspaceLayout;
