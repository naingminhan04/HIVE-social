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
import { useState } from "react";
import { GroupInfoModal } from "../GroupInfoModal";

const ChatPanelHeader = () => {
  const {
    activeChatId,
    chats,
    leaveChat,
    selectedChat,
    showPanel,
  } = useChatNavigation();
  const chat = selectedChat ?? findChatById(chats, activeChatId) ?? null;
  const [showGroupInfo, setShowGroupInfo] = useState(false);

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
  const isGroupChat = !isDraftChat(chat) && chat.type === "GROUP";
  
  const identity = (
    <>
      <RecoverableImage
        src={getChatImage(chat) || "/default-avatar.png"}
        alt={getChatTitle(chat)}
        width={42}
        height={42}
        className="h-9 w-9 rounded-full bg-neutral-200 object-cover"
        wrapperClassName="h-9 w-9 shrink-0 rounded-full"
        fallbackSrc="/default-avatar.png"
        userId={profileUser?.id}
        showOnlineStatus={!!profileUser?.id}
        onlineStatusSize="sm"
      />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold text-slate-700 dark:text-neutral-100">
          {getChatTitle(chat)}
        </h2>
        <p className="truncate text-xs text-neutral-400">
          {isDraftChat(chat) ? `@${chat.user.username}` : getPanelSubtitle(chat)}
        </p>
      </div>
    </>
  );

  return (
    <>
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2.5 border-b border-black/5 bg-white px-3 dark:border-white/10 dark:bg-neutral-900">
        <button
          type="button"
          onClick={leaveChat}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-900"
          aria-label="Back to chats"
        >
          <ArrowLeft size={18} />
        </button>
        {profileHref ? (
          <Link
            href={profileHref}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            {identity}
          </Link>
        ) : isGroupChat ? (
          <button
            onClick={() => setShowGroupInfo(true)}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 text-left"
          >
            {identity}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">{identity}</div>
        )}
      </div>
      {showGroupInfo && !isDraftChat(chat) && chat.type === "GROUP" && (
        <GroupInfoModal chat={chat} onClose={() => setShowGroupInfo(false)} />
      )}
    </>
  );
};

export default ChatPanelHeader;
