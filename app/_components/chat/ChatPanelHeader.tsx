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
import Link from "next/link";

const ChatPanelHeader = () => {
  const {
    activeChatId,
    chats,
    leaveChat,
    selectedChat,
    showPanel,
  } = useChatNavigation();
  const chat = selectedChat ?? findChatById(chats, activeChatId) ?? null;

  if (!showPanel || !chat) {
    return null;
  }

  const profileUser = isDraftChat(chat)
    ? chat.user
    : chat.type === "PRIVATE"
      ? chat.otherUser?.user ?? null
      : null;
  const profileHref = profileUser?.username
    ? `/users/${encodeURIComponent(profileUser.username)}`
    : null;
  const identity = (
    <>
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
    </>
  );

  return (
    <div className="flex h-15 shrink-0 items-center gap-3 border-b border-black/5 px-4 dark:border-white/10">
      <button
        type="button"
        onClick={leaveChat}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-900"
        aria-label="Back to chats"
      >
        <ArrowLeft size={20} />
      </button>
      {profileHref ? (
        <Link
          href={profileHref}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          {identity}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{identity}</div>
      )}
    </div>
  );
};

export default ChatPanelHeader;
