"use client";

import type { Chat, SelectedChat } from "@/types/chat";
import { findChatById, syncChatUrl } from "@/utils/chatRoutes";
import { isDraftChat } from "@/utils/chatDisplay";
import {
  createContext,
  useCallback,
  useContext,
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
  openChat: (chat: SelectedChat, options?: { replyMsgId?: string | null }) => void;
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
  const [chats, setChats] = useState(initialChats);
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatId);
  const [selectedChat, setSelectedChat] = useState<SelectedChat | null>(() =>
    initialChatId ? findChatById(initialChats, initialChatId) ?? null : null,
  );
  const [isLeavingChat, setIsLeavingChat] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const openChat = useCallback(
    (chat: SelectedChat, options?: { replyMsgId?: string | null }) => {
      setIsLeavingChat(false);
      setSelectedChat(chat);
      const chatId = isDraftChat(chat) ? chat.user.id : chat.id;
      setActiveChatId(chatId);
      syncChatUrl(chatId, options?.replyMsgId ?? null);
    },
    [],
  );

  const leaveChat = useCallback(() => {
    setIsLeavingChat(true);
    setSelectedChat(null);
    setActiveChatId(null);
    syncChatUrl(null);
  }, []);

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
