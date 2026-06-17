"use client";

import ChatListItem from "./ChatListItem";
import { useChatNavigation } from "@/app/_components/chat/ChatNavigation";
import { useAuthStore } from "@/store/auth";
import { getUnreadChatsCount } from "@/utils/chatDisplay";
import { MessageCircle, ChevronLeft } from "lucide-react";
import { useRouter } from "nextjs-toploader/app";

type ChatListSectionProps = {
  activeChatId?: string | null;
};

const ChatListSection = ({ activeChatId: activeChatIdProp }: ChatListSectionProps) => {
  const router = useRouter();
  const { chats, activeChatId: contextActiveChatId } = useChatNavigation();
  const activeChatId = contextActiveChatId ?? activeChatIdProp ?? null;
  const viewer = useAuthStore((state) => state.user);
  const unreadChatsCount = getUnreadChatsCount(chats, viewer?.id);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div
        className="z-30 flex h-14 w-full justify-between bg-white/95 font-semibold backdrop-blur dark:bg-neutral-900/95 sticky top-15 items-center border-b border-black/5 px-3 dark:border-white/10 lg:top-0"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <button
            onClick={handleBack}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white text-neutral-700 shadow-sm transition hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            aria-label="Go back"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-400 text-white dark:bg-white dark:text-black">
            <MessageCircle size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="truncate text-sm text-neutral-950 dark:text-neutral-50 sm:text-base">
              Chat
            </span>
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
              {unreadChatsCount > 0
                ? `${unreadChatsCount} unread ${unreadChatsCount === 1 ? "chat" : "chats"}`
                : "All caught up"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
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
