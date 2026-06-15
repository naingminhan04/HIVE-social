"use client";

import ChatListItem from "./ChatListItem";
import { useChatNavigation } from "@/app/_components/chat/ChatNavigation";
import { useAuthStore } from "@/store/auth";
import { chatHasUnread } from "@/utils/chatDisplay";
import { MessageCircle } from "lucide-react";

type ChatListSectionProps = {
  activeChatId?: string | null;
};

const ChatListSection = ({ activeChatId: activeChatIdProp }: ChatListSectionProps) => {
  const { chats, activeChatId: contextActiveChatId } = useChatNavigation();
  const activeChatId = contextActiveChatId ?? activeChatIdProp ?? null;
  const viewer = useAuthStore((state) => state.user);
  const unreadChatsCount = chats.filter((chat) => chatHasUnread(chat, viewer?.id)).length;

  return (
    <>
      <div className="shrink-0 rounded-xl border-2 border-white bg-white px-4 py-4 dark:border-neutral-900 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-400 text-white dark:bg-white dark:text-black">
            <MessageCircle size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-neutral-50">
              Messages
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {unreadChatsCount > 0
                ? `${unreadChatsCount} unread ${unreadChatsCount === 1 ? "chat" : "chats"}`
                : "All caught up"}
            </p>
          </div>
        </div>
      </div>

      {chats.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-white bg-white px-6 py-16 text-center dark:border-neutral-900 dark:bg-neutral-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-500 dark:bg-blue-500/10 dark:text-blue-300">
            <MessageCircle size={24} />
          </div>
          <div>
            <p className="text-base font-medium text-neutral-800 dark:text-neutral-100">
              No conversations yet
            </p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Start a chat and send the first message.
            </p>
          </div>
        </div>
      ) : (
        chats.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            initialActive={chat.id === activeChatId}
          />
        ))
      )}
    </>
  );
};

export default ChatListSection;
