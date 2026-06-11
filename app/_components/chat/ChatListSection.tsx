"use client";

import ChatListItem from "./ChatListItem";
import { useChatNavigation } from "@/app/_components/chat/ChatNavigation";
import { useAuthStore } from "@/store/auth";
import { chatHasUnread } from "@/utils/chatDisplay";

type ChatListSectionProps = {
  activeChatId: string | null;
};

const ChatListSection = ({ activeChatId }: ChatListSectionProps) => {
  const { chats } = useChatNavigation();
  const viewer = useAuthStore((state) => state.user);
  const unreadChatsCount = chats.filter((chat) => chatHasUnread(chat, viewer?.id)).length;

  return (
    <section className="flex h-full min-h-0 w-full flex-col">
      <div className="shrink-0 border-b border-black/5 px-4 py-5 dark:border-white/10">
        <h2 className="text-2xl font-bold text-slate-700 dark:text-neutral-100">
          Messages
        </h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {unreadChatsCount} unread {unreadChatsCount === 1 ? "chat" : "chats"}
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
