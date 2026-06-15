"use client";

import { useChatNavigation } from "@/app/_components/chat/ChatNavigation";
import type { ReactNode } from "react";

type ChatWorkspaceLayoutProps = {
  list: ReactNode;
  panel: ReactNode;
};

const ChatWorkspaceLayout = ({ list, panel }: ChatWorkspaceLayoutProps) => {
  const { showPanel } = useChatNavigation();

  if (showPanel) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border-2 border-white bg-white dark:border-neutral-900 dark:bg-neutral-900">
        {panel}
      </div>
    );
  }

  return <>{list}</>;
};

export default ChatWorkspaceLayout;
