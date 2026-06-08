"use client";

import RecoverableImage from "../common/RecoverableImage";
import { useChatNavigation } from "@/app/_components/chat/ChatNavigation";
import { findChatById } from "@/utils/chatRoutes";
import {
  getChatImage,
  getChatTitle,
  getPanelSubtitle,
  isDraftChat,
} from "@/utils/chatDisplay";
import { ArrowLeft } from "lucide-react";

type ChatPanelHeaderProps = {
  isSocketConnected?: boolean;
};

const ChatPanelHeader = ({ isSocketConnected: socketProp }: ChatPanelHeaderProps) => {
  const {
    activeChatId,
    chats,
    isSocketConnected: socketFromContext,
    leaveChat,
    selectedChat,
    showPanel,
  } = useChatNavigation();
  const isSocketConnected = socketProp ?? socketFromContext;
  const chat = selectedChat ?? findChatById(chats, activeChatId) ?? null;

  if (!showPanel || !chat) {
    return null;
  }

  return (
    <div className="flex h-15 shrink-0 items-center gap-3 border-b border-black/5 px-3 dark:border-white/10">
      <button
        type="button"
        onClick={leaveChat}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-900"
        aria-label="Back to chats"
      >
        <ArrowLeft size={20} />
      </button>
      <RecoverableImage
        src={getChatImage(chat) || "/default-avatar.png"}
        alt={getChatTitle(chat)}
        width={42}
        height={42}
        className="h-10 w-10 rounded-full bg-neutral-200 object-cover"
        wrapperClassName="h-10 w-10 shrink-0 rounded-full"
        fallbackSrc="/default-avatar.png"
      />
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-semibold text-slate-700 dark:text-neutral-100">
          {getChatTitle(chat)}
        </h2>
        <p className="truncate text-xs text-neutral-400">
          {isDraftChat(chat) ? `@${chat.user.username}` : getPanelSubtitle(chat)}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${isSocketConnected
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "bg-neutral-100 text-neutral-400 dark:bg-neutral-900"
          }`}
      >
        {isSocketConnected ? "Live" : "Offline"}
      </span>
    </div>
  );
};

export default ChatPanelHeader;
