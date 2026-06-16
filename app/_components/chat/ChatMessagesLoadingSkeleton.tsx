import React from "react";

function ChatMessageSkeleton({ isMine = false }: { isMine?: boolean }) {
  return (
    <div className={`flex animate-pulse gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`w-[min(16rem,70%)] space-y-2 rounded-2xl px-3 py-3 ${
          isMine ? "rounded-br-md bg-neutral-200 dark:bg-neutral-800" : "rounded-bl-md bg-neutral-200 dark:bg-neutral-800"
        }`}
      >
        <div className="h-3 w-28 max-w-full rounded bg-neutral-300 dark:bg-neutral-700" />
        <div className="h-3 w-40 max-w-full rounded bg-neutral-300/80 dark:bg-neutral-700/80" />
      </div>
    </div>
  );
}

export function ChatMessagesLoadingSkeleton() {
  return (
    <div className="space-y-4 py-2">
      <ChatMessageSkeleton />
      <ChatMessageSkeleton isMine />
      <ChatMessageSkeleton />
      <ChatMessageSkeleton isMine />
      <ChatMessageSkeleton />
    </div>
  );
}
