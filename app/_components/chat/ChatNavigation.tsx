"use client";

import type { Chat, SelectedChat } from "@/types/chat";
import {
  buildChatPath,
  findChatById,
  syncChatUrl,
} from "@/utils/chatRoutes";
import { isDraftChat } from "@/utils/chatDisplay";
import { useRouter } from "nextjs-toploader/app";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ChatNavigationContextValue = {
  chats: Chat[];
  setChats: (chats: Chat[]) => void;
  activeChatId: string | null;
  selectedChat: SelectedChat | null;
  setSelectedChat: (chat: SelectedChat | null) => void;
  showPanel: boolean;
  isLeavingChat: boolean;
  setIsLeavingChat: (value: boolean) => void;
  openChat: (chat: SelectedChat, options?: { replyMsgId?: string | null; navigate?: boolean }) => void;
  leaveChat: () => void;
  syncReplyInUrl: (replyMsgId: string | null) => void;
  isSocketConnected: boolean;
  setIsSocketConnected: (connected: boolean) => void;
};

const ChatNavigationContext = createContext<ChatNavigationContextValue | null>(null);

export const useChatNavigation = () => {
  const context = useContext(ChatNavigationContext);
  if (!context) {
    throw new Error("useChatNavigation must be used within ChatNavigationProvider");
  }
  return context;
};

type ChatNavigationProviderProps = {
  children: ReactNode;
  initialChats: Chat[];
  initialChatId: string | null;
};

export const ChatNavigationProvider = ({
  children,
  initialChats,
  initialChatId,
}: ChatNavigationProviderProps) => {
  const router = useRouter();
  const [chats, setChats] = useState(initialChats);
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatId);
  const [selectedChat, setSelectedChat] = useState<SelectedChat | null>(() =>
    initialChatId ? findChatById(initialChats, initialChatId) ?? null : null,
  );
  const [isLeavingChat, setIsLeavingChat] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    setActiveChatId(initialChatId);
    if (!initialChatId) {
      setSelectedChat(null);
      return;
    }
    const matched = findChatById(chats, initialChatId);
    if (matched) {
      setSelectedChat(matched);
    }
  }, [initialChatId, chats]);

  const openChat = useCallback(
    (chat: SelectedChat, options?: { replyMsgId?: string | null; navigate?: boolean }) => {
      const chatId = isDraftChat(chat) ? chat.user.id : chat.id;

      setIsLeavingChat(false);
      setSelectedChat(chat);
      setActiveChatId(chatId);

      if (options?.navigate === false) {
        syncChatUrl(chatId, options.replyMsgId ?? null);
        return;
      }

      router.push(
        buildChatPath(chat, {
          replyMsgId: options?.replyMsgId ?? null,
        }),
      );
    },
    [router],
  );

  const leaveChat = useCallback(() => {
    setIsLeavingChat(true);
    setSelectedChat(null);
    setActiveChatId(null);
    router.back();
  }, [router]);

  const syncReplyInUrl = useCallback(
    (replyMsgId: string | null) => {
      if (!activeChatId) return;
      syncChatUrl(activeChatId, replyMsgId);
    },
    [activeChatId],
  );

  const showPanel = !isLeavingChat && Boolean(activeChatId || selectedChat);

  const value = useMemo(
    () => ({
      chats,
      setChats,
      activeChatId,
      selectedChat,
      setSelectedChat,
      showPanel,
      isLeavingChat,
      setIsLeavingChat,
      openChat,
      leaveChat,
      syncReplyInUrl,
      isSocketConnected,
      setIsSocketConnected,
    }),
    [
      activeChatId,
      chats,
      isLeavingChat,
      isSocketConnected,
      leaveChat,
      openChat,
      selectedChat,
      showPanel,
      syncReplyInUrl,
    ],
  );

  return (
    <ChatNavigationContext.Provider value={value}>{children}</ChatNavigationContext.Provider>
  );
};
