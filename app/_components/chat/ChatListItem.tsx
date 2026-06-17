"use client";

import RecoverableImage from "../common/RecoverableImage";
import { useChatNavigation } from "@/app/_components/chat/ChatNavigation";
import { useAuthStore } from "@/store/auth";
import type { Chat } from "@/types/chat";
import {
  chatHasUnread,
  getChatImage,
  getChatSubtitle,
  getChatTitle,
} from "@/utils/chatDisplay";
import { formatDate } from "@/utils/formatDate";

type ChatListItemProps = {
  chat: Chat;
  initialActive: boolean;
};

const ChatListItem = ({ chat, initialActive }: ChatListItemProps) => {
  const viewer = useAuthStore((state) => state.user);
  const { activeChatId, openChat } = useChatNavigation();
  const isActive = activeChatId ? activeChatId === chat.id : initialActive;
  const hasUnread = chatHasUnread(chat, viewer?.id);

  return (
    <button
      type="button"
      onClick={() => openChat(chat)}
      className={`relative flex w-full min-w-0 items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${
        isActive
          ? "border-blue-200 bg-blue-50 dark:border-blue-500/40 dark:bg-neutral-800"
          : hasUnread
            ? "border-blue-100 bg-blue-50/80 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:hover:bg-blue-500/15"
            : "border-white bg-white hover:bg-blue-100 dark:border-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800"
      }`}
    >
      <div className="relative shrink-0">
        <RecoverableImage
          src={getChatImage(chat) || "/default-avatar.png"}
          alt={getChatTitle(chat)}
          width={54}
          height={54}
          className="h-13 w-13 rounded-full bg-neutral-200 object-cover"
          wrapperClassName="h-13 w-13 shrink-0 rounded-full"
          fallbackSrc="/default-avatar.png"
          userId={chat.otherUser?.user.id}
          showOnlineStatus={!!chat.otherUser}
          onlineStatusSize="sm"
        />
        {hasUnread && !isActive && (
          <span
            className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-blue-500 dark:border-neutral-900"
            aria-hidden
          />
        )}
      </div>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center justify-between gap-2">
          <span
            className={`truncate ${hasUnread
              ? "font-bold text-slate-800 dark:text-neutral-50"
              : "font-semibold text-slate-700 dark:text-neutral-100"
              }`}
          >
            {getChatTitle(chat)}
          </span>
          {chat.lastMessage && (
            <span
              className={`shrink-0 text-xs ${hasUnread ? "font-semibold text-blue-600 dark:text-blue-400" : "text-neutral-400"
                }`}
            >
              {formatDate(chat.lastMessage.createdAt, false, true)}
            </span>
          )}
        </span>
        <span
          className={`mt-1 block truncate text-sm ${hasUnread
            ? "font-medium text-slate-700 dark:text-neutral-200"
            : "text-neutral-500 dark:text-neutral-400"
            }`}
        >
          {getChatSubtitle(chat, viewer?.id)}
        </span>
      </span>
    </button>
  );
};

export default ChatListItem;
