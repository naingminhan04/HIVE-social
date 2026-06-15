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
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      <div className="z-10 shrink-0">
        <div className="rounded-xl border-2 border-white bg-white px-3 dark:border-neutral-900 dark:bg-neutral-900">
          <div className="flex h-14 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-400 text-white dark:bg-white dark:text-black">
              <MessageCircle size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold text-slate-800 dark:text-neutral-50">
                Messages
              </h1>
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {unreadChatsCount > 0
                  ? `${unreadChatsCount} unread ${unreadChatsCount === 1 ? "chat" : "chats"}`
                  : "All caught up"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto overscroll-x-none overscroll-contain scrollbar-none touch-pan-y">
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
      </div>
    </div>
  );
};

export default ChatListSection;
