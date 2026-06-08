"use client";

import { useQuery } from "@tanstack/react-query";
import { getUnreadMessagesCountAction } from "@/app/_actions/chat";
import ChatListItem from "./ChatListItem";
import { useChatNavigation } from "@/app/_components/chat/ChatNavigation";

type ChatListSectionProps = {
  activeChatId: string | null;
  unreadCount: number;
};

const ChatListSection = ({ activeChatId, unreadCount }: ChatListSectionProps) => {
  const { chats } = useChatNavigation();
  const unreadCountQuery = useQuery({
    queryKey: ["chatUnreadCount"],
    queryFn: async () => {
      const result = await getUnreadMessagesCountAction();
      if (!result.success) throw new Error(result.error);
      return result.data.unreadMessagesCount;
    },
    initialData: unreadCount,
    staleTime: 30_000,
  });

  const currentUnreadCount = unreadCountQuery.data ?? unreadCount;
  return (
    <section className="flex h-full min-h-0 w-full flex-col">
      <div className="shrink-0 border-b border-black/5 px-4 py-5 dark:border-white/10">
        <h2 className="text-2xl font-bold text-slate-700 dark:text-neutral-100">
          Messages
        </h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {currentUnreadCount} unread {currentUnreadCount === 1 ? "message" : "messages"}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
        {chats.length === 0 ? (
          <div className="px-5 py-10 text-sm text-neutral-500 dark:text-neutral-400">
            No conversations yet. Start a chat and send the first message.
          </div>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/10">
            {chats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                initialActive={chat.id === activeChatId}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ChatListSection;
