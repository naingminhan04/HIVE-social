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
    <div className="flex flex-col">
      <div
        className={`w-full flex-col ${
          showPanel ? "hidden" : "flex flex-col"
        }`}
      >
        {list}
      </div>
      <section
        className={`w-full flex-col overflow-hidden ${
          showPanel
            ? "flex flex-col rounded-xl border-2 border-white bg-white dark:border-neutral-900 dark:bg-neutral-900"
            : "hidden"
        }`}
      >
        {panel}
      </section>
    </div>
  );
};

export default ChatWorkspaceLayout;
