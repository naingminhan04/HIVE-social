"use client";

import {
  createChatAction,
  deleteMessageAction,
  getChatByIdAction,
  getChatsAction,
  getChatSocketConfigAction,
  getPrivateChatByUserIdAction,
  getMessageReactionsAction,
  getPrivateMessagesAction,
  markMessageReadAction,
  removeMessageReactionAction,
  sendChatMessageAction,
  sendPrivateMessageAction,
  setMessageReactionAction,
  updateMessageAction,
} from "@/app/_actions/chat";
import { searchAction } from "@/app/_actions/search";
import { getUserAction } from "@/app/_actions/user";
import { useChatNavigation } from "@/app/_components/chat/ChatNavigation";
import OverlayPortal from "./layout/OverlayPortal";
import ImageViewer from "./common/ImageViewer";
import RecoverableImage from "./common/RecoverableImage";
import { useAuthStore } from "@/store/auth";
import type {
  Chat,
  ChatMedia,
  ChatMessage,
  ChatReactionType,
  SelectedChat,
  ComposeMode,
  DraftFile,
  ChatMessagesPage,
  SendMessageInput,
} from "@/types/chat";
import type { SearchUserType } from "@/types/search";
import { formatDate } from "@/utils/formatDate";
import {
  chatMatchesId,
  findChatById,
  userToDraftChatUser,
} from "@/utils/chatRoutes";
import {
  getChatTitle,
  isDraftChat,
  visibleChatHasMessage,
} from "@/utils/chatDisplay";
import { uploadFiles } from "@/utils/uploadUtils";
import { createVideoPreviewUrl } from "@/utils/videoThumbnail";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import {
  ChevronDown,
  Clipboard,
  Edit3,
  FileText,
  Loader2,
  MessageCircle,
  PenLine,
  Reply,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import { io, type Socket } from "socket.io-client";

// Import helpers and sub-components
import {
  SCROLL_NEAR_BOTTOM_THRESHOLD,
  MESSAGES_PAGE_SIZE,
  LOAD_OLDER_SCROLL_THRESHOLD,
  getDraftFileKind,
  getMediaKind,
  formatFileSize,
  toChatMedia,
  toMessageInputMedia,
  getSelectedKey,
  makeDraftUser,
  sortMessages,
  getOlderCursor,
  getOldestMessageCreatedAt,
  getParentMessageId,
  getMessageSendStatus,
  fetchChatMessagesPage,
  scrollMessageIntoView,
  toMessagesPage,
} from "./chat/ChatHelpers";

import { ChatMessagesLoadingSkeleton } from "./chat/ChatMessagesLoadingSkeleton";
import { MessageStatusIcon } from "./chat/MessageStatusIcon";
import { ChatVideoTile } from "./chat/ChatVideoTile";
import { MessageActions, reactionOptions, reactionStatKeys } from "./chat/MessageActions";
import { ComposeModal } from "./chat/ComposeModal";
import { ReactionsModal } from "./chat/ReactionsModal";
import { ChatComposer } from "./chat/ChatComposer";

type ChatClientProps = {
  initialChats: Chat[];
  initialChatId: string | null;
};

export const ChatClient = ({ initialChats, initialChatId }: ChatClientProps) => {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const {
    activeChatId,
    isLeavingChat,
    leaveChat,
    openChat,
    selectedChat,
    setChats: setNavChats,
    setSelectedChat,
    setIsSocketConnected,
    showPanel,
    syncReplyInUrl,
  } = useChatNavigation();
  const viewer = useAuthStore((state) => state.user);
  const replyMsgIdParam = searchParams.get("replyMsgId")?.trim() || null;

  // ── UI state ──
  const [isResolvingRoute, setIsResolvingRoute] = useState(Boolean(initialChatId));
  const [composeMode, setComposeMode] = useState<ComposeMode>(null);
  const [isComposeMenuOpen, setIsComposeMenuOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [draftFiles, setDraftFiles] = useState<DraftFile[]>([]);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [privateSearch, setPrivateSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupUsers, setGroupUsers] = useState<SearchUserType[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingImages, setEditingImages] = useState<ChatMedia[]>([]);
  const [editingAttachments, setEditingAttachments] = useState<ChatMedia[]>([]);
  const [openReactionMessageId, setOpenReactionMessageId] = useState<string | null>(null);
  const [mobileActionMessage, setMobileActionMessage] = useState<ChatMessage | null>(null);
  const [deletingMessageIds, setDeletingMessageIds] = useState<string[]>([]);
  // Track pending messages with their local IDs
  const [pendingSentMessages, setPendingSentMessages] = useState<{
    id: string;
    content: string;
    hasAttachments: boolean;
    createdAt: string;
    chatId: string;
  }[]>([]);
  const [reactionUsersMessage, setReactionUsersMessage] = useState<ChatMessage | null>(null);
  const [mediaViewer, setMediaViewer] = useState<{
    items: { id: string; url: string; fileName?: string | null; mimeType?: string | null }[];
    index: number;
  } | null>(null);
  const [localReactions, setLocalReactions] = useState<Record<string, ChatReactionType | null>>({});
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [jumpToMessageId, setJumpToMessageId] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  // ── Refs ──
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastPositionedChatRef = useRef<string | null>(null);
  const activeKeyRef = useRef<string | null>(null);
  const pendingScrollPreserveRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const loadOlderSentinelRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const socketRef = useRef<Socket | null>(null);
  const readMessageIdsRef = useRef<Set<string>>(new Set());
  const activeChatRef = useRef<SelectedChat | null>(null);
  const chatsRef = useRef<Chat[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const draftFilesRef = useRef<DraftFile[]>([]);
  const handledReplyMsgIdRef = useRef<string | null>(null);
  const isResolvingRouteRef = useRef(false);

  useEffect(() => { setHasMounted(true); }, []);

  // ── Chats query ──
  const chatsQuery = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const result = await getChatsAction();
      if (!result.success) throw new Error(result.error);
      return result.data.chats.filter(visibleChatHasMessage);
    },
    initialData: initialChats,
    staleTime: 30_000,
  });

  const chats = useMemo(() => chatsQuery.data ?? initialChats, [chatsQuery.data, initialChats]);

  useEffect(() => { setNavChats(chats); }, [chats, setNavChats]);

  const activeChat = useMemo((): SelectedChat | null => {
    if (!showPanel) return null;
    if (selectedChat) return selectedChat;
    if (!activeChatId) return null;
    return findChatById(chats, activeChatId) ?? null;
  }, [activeChatId, chats, selectedChat, showPanel]);

  const activeKey = getSelectedKey(activeChat);

  useEffect(() => { activeKeyRef.current = activeKey; }, [activeKey]);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => { chatsRef.current = chats; }, [chats]);

  // ── Socket setup ──
  useEffect(() => {
    let isMounted = true;

    getChatSocketConfigAction().then((result) => {
      if (!isMounted || !result.success) return;

      const socket = io(result.data.url, {
        transports: ["websocket", "polling"],
        withCredentials: true,
        auth: result.data.token ? { token: result.data.token } : undefined,
      });

      const joinChatRooms = (roomChats: Chat[]) => {
        roomChats.forEach((chat) => {
          socket.emit("join-chat", chat.id);
        });
      };

      socketRef.current = socket;
      socket.on("connect", () => {
        setIsSocketConnected(true);
        joinChatRooms(chatsRef.current);
      });
      socket.on("disconnect", () => setIsSocketConnected(false));

      const getMessageQueryKeys = (chatId: string, message?: ChatMessage) => {
        const keys = new Set<string>();
        keys.add(chatId);

        const currentChat = activeChatRef.current;
        const currentKey = activeKeyRef.current;
        if (!currentChat || !currentKey || currentKey === "none") return [...keys];

        if (!isDraftChat(currentChat) && currentChat.id === chatId) {
          keys.add(currentKey);
        }

        if (
          isDraftChat(currentChat) &&
          message &&
          message.senderId === currentChat.user.id
        ) {
          keys.add(currentKey);
        }

        return [...keys];
      };

      const setMessageInQueries = (chatId: string, message: ChatMessage) => {
        getMessageQueryKeys(chatId, message).forEach((queryKey) => {
          queryClient.setQueryData<InfiniteData<ChatMessagesPage>>(
            ["chatMessages", queryKey],
            (current) => {
              if (!current) return current;
              const alreadyExists = current.pages.some((p) =>
                p.messages.some((m) => m.id === message.id),
              );
              if (alreadyExists) return current;
              if (current.pages.length === 0) {
                return {
                  ...current,
                  pages: [{ messages: [message], cursors: null, hasMore: false }],
                };
              }
              return {
                ...current,
                pages: current.pages.map((page, idx) =>
                  idx === current.pages.length - 1
                    ? { ...page, messages: sortMessages([...page.messages, message]) }
                    : page,
                ),
              };
            },
          );
        });
      };

      const getMessageFromPayload = (
        payload: ChatMessage | { message?: ChatMessage | string; data?: ChatMessage; chatId?: string },
      ) => {
        const record = payload as {
          message?: ChatMessage | string;
          data?: ChatMessage;
          chatId?: string;
        };
        const message =
          record.data ??
          (record.message && typeof record.message === "object"
            ? record.message
            : payload as ChatMessage);
        return {
          message,
          chatId: record.chatId ?? message?.chatId,
        };
      };

      const handleIncomingMessage = (
        payload: ChatMessage | { message?: ChatMessage | string; data?: ChatMessage; chatId?: string },
      ) => {
        try {
          const { message, chatId } = getMessageFromPayload(payload);
          if (!chatId || !message?.id) return;

          if (message.senderId !== viewer?.id) setMessageInQueries(chatId, message);

          queryClient.setQueryData<Chat[] | undefined>(["chats"], (current) => {
            if (!current) return current;
            const existing = current.find((c) => c.id === chatId);
            if (!existing) return current;
            const updatedLastMessage = {
              ...(message as ChatMessage),
              isReadByMe: message.senderId === viewer?.id,
            };
            const updated: Chat = {
              ...existing,
              lastMessage: updatedLastMessage,
              updatedAt: message?.createdAt ?? new Date().toISOString(),
            };
            return [updated, ...current.filter((c) => c.id !== chatId)];
          });

          queryClient.invalidateQueries({ queryKey: ["chatUnreadCount"] });
        } catch {
          // ignore
        }
      };

      const handleMessageUpdated = (
        payload: ChatMessage | { message?: ChatMessage | string; data?: ChatMessage; chatId?: string },
      ) => {
        try {
          const { message, chatId } = getMessageFromPayload(payload);
          if (!message?.id) return;
          getMessageQueryKeys(chatId ?? message.chatId, message).forEach((queryKey) => {
            queryClient.setQueryData<InfiniteData<ChatMessagesPage>>(
              ["chatMessages", queryKey],
              (current) => {
                if (!current) return current;
                return {
                  ...current,
                  pages: current.pages.map((page) => ({
                    ...page,
                    messages: page.messages.map((m) => (m.id === message.id ? message : m)),
                  })),
                };
              },
            );
          });
        } catch {
          // ignore
        }
      };

      const handleMessageDeleted = (
        payload: { messageId: string } | { message: { id: string } },
      ) => {
        try {
          const messageId =
            "messageId" in payload
              ? (payload as { messageId: string }).messageId
              : (payload as { message: { id: string } }).message?.id;
          if (!messageId) return;
          const ak = activeKeyRef.current;
          if (!ak || ak === "none") return;
          queryClient.setQueryData<InfiniteData<ChatMessagesPage>>(
            ["chatMessages", ak],
            (current) => {
              if (!current) return current;
              return {
                ...current,
                pages: current.pages.map((page) => ({
                  ...page,
                  messages: page.messages.map((m) =>
                    m.id === messageId ? { ...m, isDeleted: true, content: null } : m,
                  ),
                })),
              };
            },
          );
        } catch {
          // ignore
        }
      };

      const handleMessageRead = (
        payload: { messageId?: string; chatId?: string; readerId?: string } | null,
      ) => {
        try {
          if (!payload) return;
          const { messageId, chatId, readerId } = payload as {
            messageId?: string;
            chatId?: string;
            readerId?: string;
          };
          if (readerId && readerId === viewer?.id) return;

          const ak = activeKeyRef.current;
          if (!ak || ak === "none") return;
          const targetChat =
            chatId && !isDraftChat(activeChatRef.current) && activeChatRef.current?.id === chatId
              ? activeChatRef.current
              : chatId
                ? chatsRef.current.find((chat) => chat.id === chatId)
                : activeChatRef.current && !isDraftChat(activeChatRef.current)
                  ? activeChatRef.current
                  : null;
          const isGroupRead = targetChat?.type === "GROUP";

          if (messageId) {
            const queryKeys = chatId ? getMessageQueryKeys(chatId) : [ak];
            queryKeys.forEach((queryKey) => {
              queryClient.setQueryData<InfiniteData<ChatMessagesPage>>(
                ["chatMessages", queryKey],
                (current) => {
                  if (!current) return current;
                  return {
                    ...current,
                    pages: current.pages.map((page) => ({
                      ...page,
                      messages: page.messages.map((m) =>
                        m.id === messageId
                          ? {
                            ...m,
                            isRead: isGroupRead ? m.isRead : true,
                            readCount: (m.readCount ?? 0) + 1,
                          }
                          : m,
                      ),
                    })),
                  };
                },
              );
            });
          } else if (chatId) {
            if (isGroupRead) return;
            queryClient.setQueryData<InfiniteData<ChatMessagesPage>>(
              ["chatMessages", chatId],
              (current) => {
                if (!current) return current;
                return {
                  ...current,
                  pages: current.pages.map((page) => ({
                    ...page,
                    messages: page.messages.map((m) =>
                      m.senderId === viewer?.id && !m.isRead
                        ? { ...m, isRead: true }
                        : m,
                    ),
                  })),
                };
              },
            );
          }
        } catch {
          // ignore
        }
      };

      const lightRefreshChat = () => {
        queryClient.invalidateQueries({ queryKey: ["chats"] });
        queryClient.invalidateQueries({ queryKey: ["chatUnreadCount"] });
      };

      socket.on("new-chat-message", handleIncomingMessage);
      socket.on("message:updated", handleMessageUpdated);
      socket.on("message-updated", handleMessageUpdated);
      socket.on("message:deleted", handleMessageDeleted);
      socket.on("message-deleted", handleMessageDeleted);
      socket.on("message:read", handleMessageRead);
      socket.on("message-read", handleMessageRead);
      socket.on("chat-created", lightRefreshChat);
      socket.on("chat-updated", lightRefreshChat);
    });

    return () => {
      isMounted = false;
      setIsSocketConnected(false);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [queryClient, setIsSocketConnected, viewer?.id]);

  useEffect(() => { draftFilesRef.current = draftFiles; }, [draftFiles]);

  useEffect(() => {
    return () => {
      draftFilesRef.current.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, []);

  useEffect(() => {
    if (!activeChat || isDraftChat(activeChat)) return;
    socketRef.current?.emit("join-chat", activeChat.id);
  }, [activeChat]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    chats.forEach((chat) => {
      socket.emit("join-chat", chat.id);
    });
  }, [chats]);

  // ── Messages infinite query ──
  const messagesQuery = useInfiniteQuery({
    queryKey: ["chatMessages", activeKey],
    queryFn: async ({ pageParam }) => {
      if (!activeChat) return { messages: [], cursors: null };

      if (isDraftChat(activeChat) && !pageParam) {
        const bootstrap = await getPrivateMessagesAction(activeChat.user.id, {
          limit: MESSAGES_PAGE_SIZE,
          direction: "older",
        });
        if (!bootstrap.success) throw new Error(bootstrap.error);
        if (bootstrap.data.chat?.id) setSelectedChat(bootstrap.data.chat);
        return toMessagesPage(bootstrap.data);
      }

      return fetchChatMessagesPage(activeChat, pageParam as string | undefined);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.messages.length === 0) return undefined;
      const hasMoreOlder = lastPage.hasMore ?? (lastPage.messages.length >= MESSAGES_PAGE_SIZE);
      if (!hasMoreOlder) return undefined;
      const olderCursor = getOlderCursor(lastPage.cursors);
      if (olderCursor) return olderCursor;
      return getOldestMessageCreatedAt(lastPage.messages) ?? undefined;
    },
    enabled: Boolean(activeChat) && (!isDraftChat(activeChat) || Boolean(activeChat.user.id)),
  });

  useEffect(() => {
    lastPositionedChatRef.current = null;
    pendingScrollPreserveRef.current = null;
    handledReplyMsgIdRef.current = null;
    readMessageIdsRef.current = new Set();
    setJumpToMessageId(null);
    setHighlightedMessageId(null);
    setShowScrollToBottom(false);
    setOpenReactionMessageId(null);
    setReactionUsersMessage(null);
  }, [activeKey]);

  useLayoutEffect(() => {
    const preserve = pendingScrollPreserveRef.current;
    if (!preserve) return;
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight - preserve.scrollHeight + preserve.scrollTop;
    pendingScrollPreserveRef.current = null;
  }, [messagesQuery.data?.pages.length, messagesQuery.isFetchingNextPage]);

  // ── Other queries ──
  const reactionUsersQuery = useQuery({
    queryKey: ["chatMessageReactions", reactionUsersMessage?.id],
    queryFn: async () => {
      if (!reactionUsersMessage) return null;
      const result = await getMessageReactionsAction(reactionUsersMessage.id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(reactionUsersMessage),
  });

  const privateSearchQuery = useQuery({
    queryKey: ["chatUserSearch", privateSearch],
    queryFn: async () => {
      const result = await searchAction(privateSearch, 10);
      if (!result.success) throw new Error(result.error);
      return result.data.users.filter((u) => u.id !== viewer?.id);
    },
    enabled: composeMode === "private" && privateSearch.trim().length > 0,
  });

  const groupSearchQuery = useQuery({
    queryKey: ["chatGroupUserSearch", groupSearch],
    queryFn: async () => {
      const result = await searchAction(groupSearch, 12);
      if (!result.success) throw new Error(result.error);
      return result.data.users.filter((u) => u.id !== viewer?.id);
    },
    enabled: composeMode === "group" && groupSearch.trim().length > 0,
  });

  const privateSearchResults = privateSearchQuery.data ?? [];
  const groupSearchResults = groupSearchQuery.data ?? [];

  // ── Send mutation ──
  const sendMutation = useMutation<
    ChatMessage,
    Error,
    { content: string; parentMessageId?: string | null; draftFiles: DraftFile[] },
    { pendingId: string }
  >({
    mutationFn: async ({ content, parentMessageId, draftFiles: mutationDraftFiles }) => {
      if (!selectedChat) throw new Error("Select a chat first");
      if (!content && mutationDraftFiles.length === 0) throw new Error("Message cannot be empty");

      const input: SendMessageInput = {
        content,
        ...(parentMessageId ? { parentMessageId } : {}),
      };

      if (mutationDraftFiles.length > 0) {
        const uploadedFiles = await uploadFiles(mutationDraftFiles.map((df) => df.file));
        const uploadedWithKind = uploadedFiles.map((file, idx) => ({
          file: toChatMedia(file),
          kind: mutationDraftFiles[idx]?.kind ?? getMediaKind(file),
        }));
        const media = uploadedWithKind.filter(({ kind }) => kind === "image" || kind === "video").map(({ file }) => file);
        const attachments = uploadedWithKind.filter(({ kind }) => kind === "audio" || kind === "file").map(({ file }) => file);
        if (media.length > 0) input.images = media;
        if (attachments.length > 0) input.attachments = attachments;
      }

      const result = isDraftChat(selectedChat)
        ? await sendPrivateMessageAction(selectedChat.user.id, input)
        : selectedChat.type === "PRIVATE" && selectedChat.otherUser
          ? await sendPrivateMessageAction(selectedChat.otherUser.userId, input)
          : await sendChatMessageAction(selectedChat.id, input);

      if (!result.success) throw new Error(result.error);
      return result.data.data;
    },
    onMutate: async ({ content, draftFiles: mutationDraftFiles }) => {
      const pendingId = `pending-${crypto.randomUUID()}`;
      setPendingSentMessages((prev) => [
        ...prev,
        {
          id: pendingId,
          content,
          hasAttachments: mutationDraftFiles.length > 0,
          createdAt: new Date().toISOString(),
          chatId: activeChat && !isDraftChat(activeChat) ? activeChat.id : selectedChat && !isDraftChat(selectedChat) ? selectedChat.id : "",
        },
      ]);
      setMessageText("");
      setReplyToMessage(null);
      return { pendingId };
    },
    onSuccess: async (message, _vars, context) => {
      setPendingSentMessages((prev) => prev.filter((m) => m.id !== context?.pendingId));

      if (activeKey) {
        queryClient.setQueryData<InfiniteData<ChatMessagesPage>>(
          ["chatMessages", activeKey],
          (current) => {
            if (!current) return current;
            const alreadyHasMessage = current.pages.some((p) => p.messages.some((m) => m.id === message.id));
            if (alreadyHasMessage) return current;
            if (current.pages.length === 0) {
              return { ...current, pages: [{ messages: [message], cursors: null, hasMore: false }] };
            }
            return {
              ...current,
              pages: current.pages.map((page, idx) =>
                idx === current.pages.length - 1
                  ? { ...page, messages: sortMessages([...page.messages, message]) }
                  : page,
              ),
            };
          },
        );
      }

      setDraftFiles((prev) => {
        prev.forEach((f) => URL.revokeObjectURL(f.previewUrl));
        return [];
      });
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
      await queryClient.invalidateQueries({ queryKey: ["chatUnreadCount"] });
    },
    onError: (error, _vars, context) => {
      setPendingSentMessages((prev) => prev.filter((m) => m.id !== context?.pendingId));
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    },
    onSettled: (_data, _error, _vars, context) => {
      setPendingSentMessages((prev) => prev.filter((m) => m.id !== context?.pendingId));
    },
  });

  // ── Edit mutation ──
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingMessageId) throw new Error("Pick a message to edit");
      const content = editingText.trim();
      if (!content && editingImages.length === 0 && editingAttachments.length === 0 && draftFiles.length === 0) {
        throw new Error("Message cannot be empty");
      }
      const input: SendMessageInput = {
        content,
        images: editingImages.map(toMessageInputMedia),
        attachments: editingAttachments.map(toMessageInputMedia),
      };
      if (draftFiles.length > 0) {
        const uploadedFiles = await uploadFiles(draftFiles.map((df) => df.file));
        const uploadedWithKind = uploadedFiles.map((file, idx) => ({
          file: toChatMedia(file),
          kind: draftFiles[idx]?.kind ?? getMediaKind(file),
        }));
        input.images = [
          ...(input.images ?? []),
          ...uploadedWithKind.filter(({ kind }) => kind === "image" || kind === "video").map(({ file }) => file),
        ];
        input.attachments = [
          ...(input.attachments ?? []),
          ...uploadedWithKind.filter(({ kind }) => kind === "audio" || kind === "file").map(({ file }) => file),
        ];
      }
      const result = await updateMessageAction(editingMessageId, input);
      if (!result.success) throw new Error(result.error);
      return result.data.data;
    },
    onSuccess: async () => {
      setEditingMessageId(null);
      setEditingText("");
      setEditingImages([]);
      setEditingAttachments([]);
      setDraftFiles((prev) => { prev.forEach((f) => URL.revokeObjectURL(f.previewUrl)); return []; });
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
      await queryClient.invalidateQueries({ queryKey: ["chatMessages", activeKey] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to edit message");
    },
  });

  // ── Delete mutation ──
  const deleteMutation = useMutation<string, Error, string>({
    mutationFn: async (messageId: string) => {
      const result = await deleteMessageAction(messageId);
      if (!result.success) throw new Error(result.error);
      return result.data.messageId;
    },
    onMutate: async (messageId) => {
      setDeletingMessageIds((prev) => (prev.includes(messageId) ? prev : [...prev, messageId]));
      setOpenReactionMessageId((prev) => (prev === messageId ? null : prev));
    },
    onError: (_error, messageId) => {
      setDeletingMessageIds((prev) => prev.filter((id) => id !== messageId));
      toast.error(_error instanceof Error ? _error.message : "Failed to delete message");
    },
    onSettled: (_data, _error, messageId) => {
      if (!messageId) return;
      setDeletingMessageIds((prev) => prev.filter((id) => id !== messageId));
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      if (activeKey) queryClient.invalidateQueries({ queryKey: ["chatMessages", activeKey] });
    },
  });

  // ── Mark read mutation ──
  const markReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const result = await markMessageReadAction(messageId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: async (_data, messageId) => {
      if (activeKey) {
        queryClient.setQueryData<InfiniteData<ChatMessagesPage>>(
          ["chatMessages", activeKey],
          (current) => {
            if (!current) return current;
            return {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                messages: page.messages.map((m) =>
                  m.id === messageId ? { ...m, isReadByMe: true, isRead: true } : m,
                ),
              })),
            };
          },
        );
      }
      queryClient.setQueryData<Chat[] | undefined>(["chats"], (current) => {
        if (!current) return current;
        return current.map((chat) =>
          chat.lastMessage?.id === messageId
            ? {
              ...chat,
              lastMessage: {
                ...chat.lastMessage,
                isReadByMe: true,
                isRead: true,
              },
            }
            : chat,
        );
      });
      await queryClient.invalidateQueries({ queryKey: ["chatUnreadCount"] });
    },
    onError: (_error, messageId) => {
      readMessageIdsRef.current.delete(messageId);
    },
  });

  // ── Reaction mutation ──
  const reactionMutation = useMutation({
    mutationFn: async ({
      messageId,
      reactionType,
      currentReaction,
    }: { messageId: string; reactionType: ChatReactionType; currentReaction?: ChatReactionType | null }) => {
      if (currentReaction === reactionType) {
        const result = await removeMessageReactionAction(messageId);
        if (!result.success) throw new Error(result.error);
        return { messageId, reactionType: null };
      }
      const result = await setMessageReactionAction(messageId, reactionType);
      if (!result.success) throw new Error(result.error);
      return { messageId, reactionType };
    },
    onSuccess: async ({ messageId, reactionType }) => {
      setLocalReactions((prev) => ({ ...prev, [messageId]: reactionType }));
      await queryClient.invalidateQueries({ queryKey: ["chatMessages", activeKey] });
      await queryClient.invalidateQueries({ queryKey: ["chatMessageReactions", messageId] });
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update reaction");
    },
  });

  // ── Create group mutation ──
  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const name = groupName.trim();
      if (!name) throw new Error("Group name is required");
      if (groupUsers.length === 0) throw new Error("Pick at least one member");
      const result = await createChatAction({
        type: "GROUP",
        name,
        participantIds: groupUsers.map((u) => u.id),
      });
      if (!result.success) throw new Error(result.error);
      return result.data.chat;
    },
    onSuccess: async (chat) => {
      openChat(chat);
      setComposeMode(null);
      setGroupName("");
      setGroupSearch("");
      setGroupUsers([]);
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
      toast.success("Group created");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create group");
    },
  });

  // ── Derived message lists ──
  const messages = useMemo(() => {
    const pages = messagesQuery.data?.pages ?? [];
    const unique = new Map<string, ChatMessage>();
    pages.forEach((page) => page.messages.forEach((m) => unique.set(m.id, m)));
    return sortMessages(Array.from(unique.values()));
  }, [messagesQuery.data?.pages]);

  const combinedMessages = useMemo(() => {
    if (pendingSentMessages.length === 0 || !viewer) return messages;
    const pendingChatMessages: ChatMessage[] = pendingSentMessages.map((pending) => ({
      id: pending.id,
      content: pending.content,
      senderId: viewer.id,
      sender: { id: viewer.id, name: viewer.name, username: viewer.username, profilePic: viewer.profilePic },
      chatId: pending.chatId,
      type: "CONTENT",
      createdAt: pending.createdAt,
      updatedAt: pending.createdAt,
      isEdited: false,
      isDeleted: false,
      images: [],
      attachments: [],
      parentMessageId: null,
      forwardedMessageId: null,
      parentMessage: null,
      forwardedMessage: null,
      myReaction: null,
      reactionStats: undefined,
      mentions: [],
    }));
    return [...messages, ...pendingChatMessages];
  }, [messages, pendingSentMessages, viewer]);

  // ── Scroll helpers ──
  const updateScrollToBottomVisibility = useCallback(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    const nearBottom = distanceFromBottom <= SCROLL_NEAR_BOTTOM_THRESHOLD;
    isNearBottomRef.current = nearBottom;
    setShowScrollToBottom(!nearBottom);
  }, []);

  const dismissMessageOverlays = useCallback(() => {
    setOpenReactionMessageId(null);
    setMobileActionMessage(null);
    setReactionUsersMessage(null);
  }, []);

  const startReplyToMessage = useCallback((message: ChatMessage) => {
    dismissMessageOverlays();
    setReplyToMessage(message);
    requestAnimationFrame(() => composerTextareaRef.current?.focus({ preventScroll: true }));
  }, [dismissMessageOverlays]);

  useEffect(() => {
    if (!replyToMessage) return;
    composerTextareaRef.current?.focus({ preventScroll: true });
  }, [replyToMessage]);

  useEffect(() => {
    if (!editingMessageId) return;
    requestAnimationFrame(() => {
      const textarea = composerTextareaRef.current;
      if (!textarea) return;
      textarea.focus({ preventScroll: true });
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    });
  }, [editingMessageId]);

  const loadOlderMessages = useCallback(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport || messagesQuery.isFetchingNextPage || !messagesQuery.hasNextPage) return;
    pendingScrollPreserveRef.current = {
      scrollHeight: viewport.scrollHeight,
      scrollTop: viewport.scrollTop,
    };
    void messagesQuery.fetchNextPage();
  }, [messagesQuery]);

  const handleMessagesScroll = useCallback(() => {
    dismissMessageOverlays();
    updateScrollToBottomVisibility();
    const viewport = messagesViewportRef.current;
    if (!viewport || messagesQuery.isFetchingNextPage || !messagesQuery.hasNextPage) return;
    if (viewport.scrollTop > LOAD_OLDER_SCROLL_THRESHOLD) return;
    loadOlderMessages();
  }, [dismissMessageOverlays, loadOlderMessages, messagesQuery.hasNextPage, messagesQuery.isFetchingNextPage, updateScrollToBottomVisibility]);

  useEffect(() => {
    const viewport = messagesViewportRef.current;
    const sentinel = loadOlderSentinelRef.current;
    if (!viewport || !sentinel || !showPanel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        loadOlderMessages();
      },
      { root: viewport, rootMargin: "120px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadOlderMessages, showPanel, activeKey]);

  const scrollMessagesToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    setShowScrollToBottom(false);
  }, []);

  const updateReplyMsgIdInUrl = useCallback(
    (messageId: string | null) => syncReplyInUrl(messageId),
    [syncReplyInUrl],
  );

  const scrollToChatMessage = (messageId: string) => {
    updateReplyMsgIdInUrl(messageId);
    setJumpToMessageId(messageId);
  };

  // ── Route resolution ──
  useEffect(() => {
    if (activeChatId) return;
    const draftUser = makeDraftUser(searchParams);
    if (draftUser) openChat({ type: "PRIVATE_DRAFT", user: draftUser });
  }, [activeChatId, openChat, searchParams]);

  useEffect(() => {
    if (!activeChatId) { setIsResolvingRoute(false); return; }
    if (isLeavingChat) return;
    if (selectedChat && chatMatchesId(selectedChat, activeChatId)) { setIsResolvingRoute(false); return; }
    const matched = findChatById(chats, activeChatId);
    if (matched) { setSelectedChat(matched); setIsResolvingRoute(false); return; }
    if (!chatsQuery.isFetched || isResolvingRouteRef.current) return;
    isResolvingRouteRef.current = true;
    setIsResolvingRoute(true);
    void (async () => {
      try {
        const chatById = await getChatByIdAction(activeChatId);
        if (chatById.success) { openChat(chatById.data, { navigate: false }); return; }
        const privateChat = await getPrivateChatByUserIdAction(activeChatId);
        if (privateChat.success) { openChat(privateChat.data.chat, { navigate: false }); return; }
        const userResult = await getUserAction(activeChatId);
        if (userResult.success) { openChat({ type: "PRIVATE_DRAFT", user: userToDraftChatUser(userResult.data) }, { navigate: false }); return; }
        toast.error("Chat not found");
        leaveChat();
      } finally {
        isResolvingRouteRef.current = false;
        setIsResolvingRoute(false);
      }
    })();
  }, [activeChatId, chats, chatsQuery.isFetched, isLeavingChat, leaveChat, openChat, selectedChat, setSelectedChat]);

  useEffect(() => {
    if (!replyMsgIdParam || !activeChat || messagesQuery.isPending) return;
    const handledKey = `${activeKey}:${replyMsgIdParam}`;
    if (handledReplyMsgIdRef.current === handledKey) return;
    handledReplyMsgIdRef.current = handledKey;
    setJumpToMessageId(replyMsgIdParam);
  }, [activeChat, activeKey, messagesQuery.isPending, replyMsgIdParam]);

  useEffect(() => {
    if (!activeChat || !viewer?.id || isDraftChat(activeChat)) return;
    const lastMessage = activeChat.lastMessage;
    if (
      lastMessage &&
      lastMessage.senderId !== viewer.id &&
      lastMessage.isReadByMe !== true &&
      !readMessageIdsRef.current.has(lastMessage.id)
    ) {
      readMessageIdsRef.current.add(lastMessage.id);
      markReadMutation.mutate(lastMessage.id);
    }
  }, [activeChat, markReadMutation, viewer?.id]);

  useEffect(() => {
    const unread = messages.filter(
      (m) => m.senderId !== viewer?.id && !m.isReadByMe && !readMessageIdsRef.current.has(m.id),
    );
    unread.forEach((m) => {
      readMessageIdsRef.current.add(m.id);
      markReadMutation.mutate(m.id);
    });
  }, [markReadMutation, messages, viewer?.id]);

  useEffect(() => {
    if (!jumpToMessageId || messagesQuery.isPending) return;
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    if (scrollMessageIntoView(viewport, jumpToMessageId, "smooth")) {
      setHighlightedMessageId(jumpToMessageId);
      const tid = window.setTimeout(() => setHighlightedMessageId(null), 2000);
      setJumpToMessageId(null);
      updateScrollToBottomVisibility();
      return () => window.clearTimeout(tid);
    }
    if (messagesQuery.isFetchingNextPage) return;
    if (messagesQuery.hasNextPage) {
      pendingScrollPreserveRef.current = {
        scrollHeight: viewport.scrollHeight,
        scrollTop: viewport.scrollTop,
      };
      void messagesQuery.fetchNextPage();
      return;
    }
    toast.error("Original message is not available");
    setJumpToMessageId(null);
  }, [jumpToMessageId, messages, messagesQuery, updateScrollToBottomVisibility]);

  useEffect(() => {
    if (messagesQuery.isPending) return;
    updateScrollToBottomVisibility();
  }, [messages, messagesQuery.isPending, updateScrollToBottomVisibility]);

  useLayoutEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!activeChat || !viewport || messagesQuery.isPending) return;
    if (pendingScrollPreserveRef.current !== null) return;

    const isInitialPosition = lastPositionedChatRef.current !== activeKey;
    if (isInitialPosition) {
      viewport.scrollTop = viewport.scrollHeight;
      lastPositionedChatRef.current = activeKey;
      isNearBottomRef.current = true;
      setShowScrollToBottom(false);
      return;
    }

    if (sendMutation.isPending) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "auto" });
      isNearBottomRef.current = true;
      setShowScrollToBottom(false);
      return;
    }

    if (isNearBottomRef.current) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      setShowScrollToBottom(false);
    }
  }, [activeChat, activeKey, messages, messagesQuery.isPending, sendMutation.isPending]);

  // ── Composer state ──
  const composerSubmitEnabled =
    Boolean(activeChat) && (!isDraftChat(activeChat) || Boolean(activeChat.user.id));

  const openPrivateDraft = (user: SearchUserType) => {
    openChat({ type: "PRIVATE_DRAFT", user });
    setComposeMode(null);
    setPrivateSearch("");
  };

  const toggleGroupUser = (user: SearchUserType) => {
    setGroupUsers((prev) =>
      prev.some((m) => m.id === user.id) ? prev.filter((m) => m.id !== user.id) : [...prev, user],
    );
  };

  const addDraftFiles = (files: File[]) => {
    if (files.length === 0) return;

    void (async () => {
      const nextDrafts = await Promise.all(
        files.map(async (file) => {
          const kind = getDraftFileKind(file);
          const previewUrl = URL.createObjectURL(file);
          const posterUrl =
            kind === "video" ? await createVideoPreviewUrl(file) : undefined;

          return {
            id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
            file,
            previewUrl,
            posterUrl: posterUrl !== previewUrl ? posterUrl : undefined,
            kind,
          };
        }),
      );

      setDraftFiles((prev) => [...prev, ...nextDrafts]);
    })();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    addDraftFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const handleComposerPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedFiles = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((f): f is File => Boolean(f));
    const files = pastedFiles.length > 0 ? pastedFiles : Array.from(event.clipboardData.files);
    if (files.length === 0) return;
    event.preventDefault();
    addDraftFiles(files);
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (composerIsPending || !composerCanSubmit || !composerSubmitEnabled) return;
    submitComposer();
  };

  const clearComposer = () => {
    setMessageText("");
    setEditingMessageId(null);
    setEditingText("");
    setEditingImages([]);
    setEditingAttachments([]);
    setReplyToMessage(null);
    setDraftFiles((prev) => { prev.forEach((f) => URL.revokeObjectURL(f.previewUrl)); return []; });
  };

  useEffect(() => {
    if (showPanel) return;
    clearComposer();
    setOpenReactionMessageId(null);
    setMobileActionMessage(null);
    setReactionUsersMessage(null);
    setMediaViewer(null);
    setHighlightedMessageId(null);
    setJumpToMessageId(null);
    setComposeMode(null);
    setIsComposeMenuOpen(false);
    setEditingMessageId(null);
    setEditingText("");
    setEditingImages([]);
    setEditingAttachments([]);
  }, [showPanel]);

  const removeDraftFile = (id: string) => {
    setDraftFiles((prev) => {
      const next = prev.filter((df) => {
        if (df.id !== id) return true;
        URL.revokeObjectURL(df.previewUrl);
        return false;
      });
      return next;
    });
  };

  const isEditing = Boolean(editingMessageId);
  const composerText = isEditing ? editingText : messageText;
  const setComposerText = isEditing ? setEditingText : setMessageText;
  const composerIsPending = isEditing ? editMutation.isPending : sendMutation.isPending;
  const composerCanSubmit =
    Boolean(composerText.trim()) ||
    draftFiles.length > 0 ||
    (isEditing && (editingImages.length > 0 || editingAttachments.length > 0));

  const submitComposer = () => {
    if (isEditing) { editMutation.mutate(); return; }
    sendMutation.mutate({ content: messageText.trim(), parentMessageId: replyToMessage?.id ?? null, draftFiles });
  };

  const startEditing = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditingText(message.content ?? "");
    setMessageText("");
    setReplyToMessage(null);
    setEditingImages(message.images ?? []);
    setEditingAttachments(message.attachments ?? []);
    setDraftFiles((prev) => { prev.forEach((f) => URL.revokeObjectURL(f.previewUrl)); return []; });
    setOpenReactionMessageId(null);
  };

  // ── Message helpers ──
  const getCurrentReaction = (message: ChatMessage) =>
    localReactions[message.id] ?? message.myReaction?.reactionType ?? null;

  const getReactionTotal = (message: ChatMessage) => message.reactionStats?.total ?? 0;

  const getVisibleReactions = (message: ChatMessage) => {
    if (!message.reactionStats) return [];
    const optionsList = [
      { type: "LIKE" as ChatReactionType, label: "Like", image: "/like.png" },
      { type: "LOVE" as ChatReactionType, label: "Love", image: "/love.png" },
      { type: "HAHA" as ChatReactionType, label: "Haha", image: "/haha.png" },
      { type: "WOW" as ChatReactionType, label: "Wow", image: "/wow.png" },
      { type: "SAD" as ChatReactionType, label: "Sad", image: "/sad.png" },
      { type: "ANGRY" as ChatReactionType, label: "Angry", image: "/angry.png" },
    ];
    return optionsList
      .map((r) => ({ ...r, count: message.reactionStats?.[reactionStatKeys[r.type]] ?? 0 }))
      .filter((r) => r.count > 0);
  };

  const getReplyPreview = (message: ChatMessage) => {
    if (!message.parentMessage) return null;
    if (typeof message.parentMessage === "string") return message.parentMessage;
    return message.parentMessage.content || "Attachment";
  };

  const openMessageMediaViewer = (items: ChatMedia[], index: number) => {
    const viewerItems = items
      .filter((m) => m.url || m.thumbnailUrl)
      .map((m) => ({ id: m.id ?? m.key, url: m.url ?? m.thumbnailUrl ?? "", fileName: m.fileName, mimeType: m.mimeType }));
    if (viewerItems.length === 0) return;
    setMediaViewer({ items: viewerItems, index });
  };

  const getSystemNoticeText = (message: ChatMessage) => {
    if (message.content?.trim()) return message.content.trim();
    if (message.systemType === "CREATED") {
      return activeChat && !isDraftChat(activeChat) && activeChat.type === "GROUP"
        ? "Group created"
        : "Account created";
    }
    return message.systemType
      ? message.systemType
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
      : "Chat update";
  };

  const renderSenderAvatar = (message: ChatMessage) => {
    const avatar = (
      <RecoverableImage
        src={message.sender.profilePic || "/default-avatar.png"}
        alt={message.sender.name}
        width={36}
        height={36}
        className="h-9 w-9 rounded-full object-cover"
        wrapperClassName="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
        fallbackSrc="/default-avatar.png"
      />
    );

    if (message.senderId === viewer?.id || !message.sender.username) {
      return avatar;
    }

    return (
      <Link
        href={`/users/${encodeURIComponent(message.sender.username)}`}
        className="shrink-0 rounded-full transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        aria-label={`Open ${message.sender.name}'s profile`}
      >
        {avatar}
      </Link>
    );
  };

  const renderMediaItem = (media: ChatMedia, mediaGroup?: ChatMedia[], index = 0) => {
    const kind = getMediaKind(media);
    const url = media.url || media.thumbnailUrl;
    if (kind === "image" && url) {
      return (
        <button
          key={media.id ?? media.key}
          type="button"
          onClick={() => openMessageMediaViewer(mediaGroup ?? [media], index)}
          className="block aspect-square w-[50cqw] max-w-full overflow-hidden rounded-lg bg-neutral-200 text-left dark:bg-neutral-800"
        >
          <RecoverableImage
            src={url}
            alt={media.fileName}
            width={288}
            height={288}
            className="h-full w-full object-cover"
            wrapperClassName="block h-full w-full overflow-hidden rounded-lg"
            fallbackSrc="/alt.png"
            showLoadingOverlay
          />
        </button>
      );
    }
    if (kind === "video" && url) {
      return (
        <ChatVideoTile
          key={media.id ?? media.key}
          media={media}
          onOpen={() => openMessageMediaViewer(mediaGroup ?? [media], index)}
        />
      );
    }
    if (kind === "audio" && media.url) {
      return (
        <div key={media.id ?? media.key} className="rounded-lg bg-black/5 p-2 dark:bg-white/10">
          <p className="mb-1 truncate text-xs opacity-70">{media.fileName}</p>
          <audio src={media.url} controls className="h-10 w-full" />
        </div>
      );
    }
    return (
      <a
        key={media.id ?? media.key}
        href={media.url ?? "#"}
        target="_blank"
        rel="noreferrer"
        className="flex h-14 min-w-0 items-center gap-2 rounded-lg bg-black/5 px-3 text-xs hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
      >
        <FileText size={16} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{media.fileName}</span>
        <span className="shrink-0 opacity-60">{formatFileSize(media.fileSize)}</span>
      </a>
    );
  };

  const openMobileMessageActions = (
    event: React.MouseEvent<HTMLElement>,
    message: ChatMessage,
    options: { disabled: boolean },
  ) => {
    if (options.disabled) return;
    const target = event.target;
    if (target instanceof Element) {
      if (target.closest("button,a,input,textarea,select,audio,video")) return;
    }
    setOpenReactionMessageId(null);
    setMobileActionMessage(message);
  };

  const copyMessageContent = async (message: ChatMessage) => {
    const text = message.content?.trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copied");
    } catch {
      toast.error("Could not copy message");
    } finally {
      setMobileActionMessage(null);
    }
  };

  const isMessagesLoading =
    Boolean(activeChat) && messages.length === 0 && (messagesQuery.isPending || messagesQuery.isFetching);
  const composerPlaceholderName = activeChat ? getChatTitle(activeChat) : "chat";
  const isRouteResolving = Boolean(activeChatId && !activeChat && isResolvingRoute);

  const mobileMessageActionSheet = mobileActionMessage ? (() => {
    const message = mobileActionMessage;
    const isMine = message.senderId === viewer?.id;
    const currentReaction = getCurrentReaction(message);
    const canCopy = Boolean(message.content?.trim());
    const canEdit = isMine && !message.isDeleted;
    const isDeleting = deletingMessageIds.includes(message.id);
    const attachmentLinks = message.attachments.filter((media) => media.url);

    return (
      <OverlayPortal>
        <div
          className="pointer-events-auto fixed inset-0 z-[120] flex items-end bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileActionMessage(null)}
        >
          <div
            className="w-full rounded-t-2xl bg-white p-4 shadow-2xl dark:bg-neutral-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {message.sender.name}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {formatDate(message.createdAt, false, true)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileActionMessage(null)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
                aria-label="Close message actions"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-1.5 rounded-full border border-black/5 bg-neutral-50 p-1 dark:border-white/10 dark:bg-neutral-900">
              {reactionOptions.map((reaction) => (
                <button
                  key={reaction.type}
                  type="button"
                  disabled={reactionMutation.isPending}
                  onClick={() => {
                    setMobileActionMessage(null);
                    reactionMutation.mutate({
                      messageId: message.id,
                      reactionType: reaction.type,
                      currentReaction,
                    });
                  }}
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-50 ${currentReaction === reaction.type
                    ? "bg-blue-100 ring-1 ring-blue-400 dark:bg-neutral-800"
                    : "hover:bg-white dark:hover:bg-neutral-800"
                    }`}
                  aria-label={`React ${reaction.label}`}
                >
                  <Image
                    src={reaction.image}
                    alt={reaction.label}
                    width={26}
                    height={26}
                    className="h-6.5 w-6.5"
                  />
                </button>
              ))}
            </div>

            <div className="mt-3 grid gap-1 overflow-hidden rounded-xl border border-black/5 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMobileActionMessage(null);
                  startReplyToMessage(message);
                }}
                className="flex h-12 items-center gap-3 px-4 text-left text-sm font-medium text-neutral-800 transition hover:bg-blue-50 active:bg-blue-100 dark:text-neutral-100 dark:hover:bg-neutral-900"
              >
                <Reply size={18} />
                <span>Reply</span>
              </button>
              {canCopy && (
                <button
                  type="button"
                  onClick={() => void copyMessageContent(message)}
                  className="flex h-12 items-center gap-3 px-4 text-left text-sm font-medium text-neutral-800 transition hover:bg-blue-50 active:bg-blue-100 dark:text-neutral-100 dark:hover:bg-neutral-900"
                >
                  <Clipboard size={18} />
                  <span>Copy message</span>
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileActionMessage(null);
                    startEditing(message);
                  }}
                  className="flex h-12 items-center gap-3 px-4 text-left text-sm font-medium text-neutral-800 transition hover:bg-blue-50 active:bg-blue-100 dark:text-neutral-100 dark:hover:bg-neutral-900"
                >
                  <Edit3 size={18} />
                  <span>Edit</span>
                </button>
              )}
              {isMine && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    setMobileActionMessage(null);
                    deleteMutation.mutate(message.id);
                  }}
                  className="flex h-12 items-center gap-3 px-4 text-left text-sm font-medium text-red-500 transition hover:bg-red-50 active:bg-red-100 disabled:opacity-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 size={18} />
                  <span>{isDeleting ? "Deleting..." : "Delete"}</span>
                </button>
              )}
            </div>

            {attachmentLinks.length > 0 && (
              <div className="mt-3 grid gap-1 overflow-hidden rounded-xl border border-black/5 dark:border-white/10">
                {attachmentLinks.map((media) => (
                  <a
                    key={media.id ?? media.key}
                    href={media.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-12 min-w-0 items-center gap-3 px-4 text-sm font-medium text-neutral-800 transition hover:bg-blue-50 active:bg-blue-100 dark:text-neutral-100 dark:hover:bg-neutral-900"
                    onClick={() => setMobileActionMessage(null)}
                  >
                    <FileText size={18} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{media.fileName}</span>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {formatFileSize(media.fileSize)}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </OverlayPortal>
    );
  })() : null;

  const chatModals = (
    <>
      {composeMode && (
        <ComposeModal
          composeMode={composeMode}
          onClose={() => setComposeMode(null)}
          privateSearch={privateSearch}
          setPrivateSearch={setPrivateSearch}
          privateSearchLoading={privateSearchQuery.isLoading}
          privateSearchResults={privateSearchResults}
          openPrivateDraft={openPrivateDraft}
          groupName={groupName}
          setGroupName={setGroupName}
          groupSearch={groupSearch}
          setGroupSearch={setGroupSearch}
          groupSearchLoading={groupSearchQuery.isLoading}
          groupSearchResults={groupSearchResults}
          groupUsers={groupUsers}
          toggleGroupUser={toggleGroupUser}
          isCreatingGroup={createGroupMutation.isPending}
          onCreateGroup={() => createGroupMutation.mutate()}
        />
      )}

      {reactionUsersMessage && (
        <ReactionsModal
          onClose={() => setReactionUsersMessage(null)}
          isLoading={reactionUsersQuery.isLoading}
          reactions={reactionUsersQuery.data?.reactions ?? []}
          currentUserId={viewer?.id}
          isRemovingOwnReaction={reactionMutation.isPending}
          onRemoveOwnReaction={(reactionType) => {
            if (!reactionUsersMessage) return;
            reactionMutation.mutate({
              messageId: reactionUsersMessage.id,
              reactionType,
              currentReaction: reactionType,
            });
          }}
        />
      )}

      {mediaViewer && (
        <ImageViewer
          images={mediaViewer.items}
          index={mediaViewer.index}
          onClose={() => setMediaViewer(null)}
          onChange={(idx) => setMediaViewer((prev) => (prev ? { ...prev, index: idx } : prev))}
          showPaginationOnVideo
        />
      )}

      {mobileMessageActionSheet}
    </>
  );

  const mountedChatModals = hasMounted ? chatModals : null;

  if (!showPanel && !hasMounted) return null;

  if (!showPanel) {
    return (
      <>
        <OverlayPortal container="chat">
          <div className="pointer-events-auto absolute bottom-5 right-5 z-20">
            <div className="relative">
              {isComposeMenuOpen && (
                <div className="pointer-events-auto absolute bottom-full right-0 mb-3 w-44 overflow-hidden rounded-lg border border-black/10 bg-white py-1 text-sm shadow-xl dark:border-white/10 dark:bg-neutral-900">
                  <button type="button" onClick={() => { setComposeMode("private"); setIsComposeMenuOpen(false); }} className="flex h-11 w-full items-center gap-3 px-3 text-left transition hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black">
                    <MessageCircle size={17} /><span>New Chat</span>
                  </button>
                  <button type="button" onClick={() => { setComposeMode("group"); setIsComposeMenuOpen(false); }} className="flex h-11 w-full items-center gap-3 px-3 text-left transition hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black">
                    <UsersRound size={17} /><span>New Group</span>
                  </button>
                </div>
              )}
              <button type="button" onClick={() => setIsComposeMenuOpen((o) => !o)} className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-300 bg-blue-300 text-neutral-950 shadow-xl transition hover:bg-blue-400 hover:text-white active:bg-blue-500 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black" aria-label="Compose chat" aria-expanded={isComposeMenuOpen}>
                <PenLine size={24} />
              </button>
            </div>
          </div>
        </OverlayPortal>
        {mountedChatModals}
      </>
    );
  }

  return (
    <>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {isRouteResolving ? (
          <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-neutral-50 px-3 py-4 text-sm text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-700 shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200">
                <Loader2 className="animate-spin" size={18} />
              </div>
              <p>Opening chat…</p>
            </div>
          </div>
        ) : (
          <div
            ref={messagesViewportRef}
            data-chat-messages-viewport=""
            onScroll={handleMessagesScroll}
            className="@container/chatview flex-1 space-y-3 overflow-y-auto bg-neutral-50/80 px-3 py-4 pb-5 scrollbar-none dark:bg-neutral-950 sm:px-4"
          >
            <div ref={loadOlderSentinelRef} className="h-px w-full shrink-0" aria-hidden />

            {messagesQuery.isFetchingNextPage && (
              <div className="flex justify-center py-3">
                <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-neutral-500 shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-400">
                  <Loader2 size={13} className="animate-spin" />
                  <span>Loading older messages…</span>
                </div>
              </div>
            )}

            {!messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage && messages.length > 0 && (
              <div className="flex justify-center py-2">
                <span className="rounded-full border border-black/5 bg-white px-3 py-1 text-xs text-neutral-400 dark:border-white/10 dark:bg-neutral-900">
                  Beginning of conversation
                </span>
              </div>
            )}

            {combinedMessages.map((message) => {
              const isMine = message.senderId === viewer?.id;
              const isSystemNotice = message.type === "SYSTEM";
              const currentReaction = getCurrentReaction(message);
              const reactionTotal = getReactionTotal(message);
              const visibleReactions = getVisibleReactions(message);
              const isDeleting = deletingMessageIds.includes(message.id);
              const isPendingSend = message.id.startsWith("pending-");
              const sendStatus = isMine
                ? getMessageSendStatus(message, activeChat, isPendingSend)
                : null;

              if (isSystemNotice) {
                return (
                  <div
                    key={message.id}
                    data-chat-message-id={message.id}
                    className="flex justify-center px-6 py-1"
                  >
                    <div
                      className={`max-w-[85%] rounded-full border border-black/5 bg-white px-3 py-1 text-center text-xs text-neutral-500 shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-400 ${highlightedMessageId === message.id ? "ring-2 ring-blue-300/90 dark:ring-white/35" : ""
                        }`}
                    >
                      <span className="wrap-break-word">{getSystemNoticeText(message)}</span>
                      <span className="ml-2 whitespace-nowrap text-[10px] opacity-60">
                        {formatDate(message.createdAt, false, true)}
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  data-chat-message-id={message.id}
                  className={`group/message flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                  onMouseLeave={(event) => {
                    const related = event.relatedTarget;
                    if (related instanceof Element) {
                      if (event.currentTarget.contains(related)) return;
                      if (related.closest("[data-chat-reaction-picker]")) return;
                    }
                    if (openReactionMessageId === message.id) setOpenReactionMessageId(null);
                  }}
                >
                  {!isMine && renderSenderAvatar(message)}

                  <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                    <div className={`flex items-center gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
                      <div
                        onClick={(event) =>
                          openMobileMessageActions(event, message, {
                            disabled: message.isDeleted || isDeleting || isPendingSend,
                          })
                        }
                        className={`relative rounded-2xl px-3 py-2 text-sm transition-shadow ${isMine
                            ? "rounded-br-md bg-blue-400 text-white dark:bg-neutral-700"
                            : "rounded-bl-md bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                          } ${isDeleting || isPendingSend ? "opacity-60" : ""} ${highlightedMessageId === message.id ? "ring-2 ring-blue-300/90 dark:ring-white/35" : ""
                          }`}
                      >
                        <div className="flex min-w-0 items-start gap-2">
                          <div className="min-w-0 flex-1 space-y-2">
                            {!isMine && (
                              <p className="mb-1 truncate text-xs font-semibold opacity-70">
                                {message.sender.name}
                              </p>
                            )}
                            {getReplyPreview(message) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const parentId = getParentMessageId(message);
                                  if (parentId) scrollToChatMessage(parentId);
                                }}
                                disabled={!getParentMessageId(message)}
                                className={`w-full border-l-2 py-1 pl-2 text-left text-xs transition hover:opacity-90 disabled:cursor-default disabled:hover:opacity-100 ${isMine
                                    ? "border-white/50 text-white/75"
                                    : "border-blue-300 text-neutral-600 dark:border-neutral-500 dark:text-neutral-300"
                                  } ${getParentMessageId(message) ? "cursor-pointer" : ""}`}
                                aria-label="Jump to replied message"
                              >
                                <p className="line-clamp-2 wrap-break-word">{getReplyPreview(message)}</p>
                              </button>
                            )}
                            {(message.images.length > 0 || message.attachments.length > 0) && (
                              <div className="grid gap-2">
                                {message.images.map((media, idx) => renderMediaItem(media, message.images, idx))}
                                {message.attachments.map((media, idx) => renderMediaItem(media, message.attachments, idx))}
                              </div>
                            )}
                            {(message.content || message.isDeleted) && (
                              <p className={`whitespace-pre-wrap wrap-break-word ${message.isDeleted ? "italic opacity-60" : ""}`}>
                                {message.isDeleted ? "Message deleted" : message.content}
                              </p>
                            )}
                          </div>
                        </div>

                        <p className={`mt-1 flex items-center justify-end gap-1 text-right text-[10px] ${isMine ? "text-white/70" : "text-neutral-400"}`}>
                          {message.isEdited && !message.isDeleted && <span>edited</span>}
                          <span>{formatDate(message.createdAt, false, true)}</span>
                          {isMine && sendStatus && <MessageStatusIcon status={sendStatus} />}
                        </p>
                      </div>

                      {!message.isDeleted && !isDeleting && !isPendingSend && (
                        <MessageActions
                          isMine={isMine}
                          message={message}
                          currentReaction={currentReaction}
                          openReactionMessageId={openReactionMessageId}
                          setOpenReactionMessageId={setOpenReactionMessageId}
                          onReply={startReplyToMessage}
                          startEditing={startEditing}
                          deleteMutation={deleteMutation}
                          reactionMutation={reactionMutation}
                          isDeleting={isDeleting}
                        />
                      )}
                    </div>

                    {!message.isDeleted && !isDeleting && !isPendingSend && visibleReactions.length > 0 && (
                      <div className={`relative mt-1 flex max-w-full flex-wrap items-center gap-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
                        <button
                          type="button"
                          onClick={() => setReactionUsersMessage(message)}
                          className={`inline-flex h-8 max-w-full items-center gap-1 rounded-full border border-black/10 bg-white px-2 text-xs font-medium text-neutral-600 shadow-sm transition hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 ${currentReaction ? "ring-1 ring-blue-400/60" : ""}`}
                          aria-label="Message reactions"
                        >
                          <span className="flex -space-x-1">
                            {visibleReactions.slice(0, 3).map((r) => (
                              <Image key={r.type} src={r.image} alt={r.label} width={18} height={18} className="h-4.5 w-4.5 rounded-full" />
                            ))}
                          </span>
                          <span>{reactionTotal}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isMessagesLoading && <ChatMessagesLoadingSkeleton />}
            {!isMessagesLoading && combinedMessages.length === 0 && (
              <div className="flex min-h-40 items-center justify-center px-8 text-center text-sm text-neutral-400">
                Send a message to start the conversation.
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {showScrollToBottom && (
          <button
            type="button"
            onClick={() => scrollMessagesToBottom("smooth")}
            className="absolute bottom-24 right-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-800 shadow-lg transition hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
            aria-label="Scroll to latest messages"
          >
            <ChevronDown size={20} />
          </button>
        )}

        {showPanel && (
          <ChatComposer
            isEditing={isEditing}
            clearComposer={clearComposer}
            replyToMessage={replyToMessage}
            setReplyToMessage={setReplyToMessage}
            updateReplyMsgIdInUrl={updateReplyMsgIdInUrl}
            editingImages={editingImages}
            setEditingImages={setEditingImages}
            editingAttachments={editingAttachments}
            setEditingAttachments={setEditingAttachments}
            draftFiles={draftFiles}
            removeDraftFile={removeDraftFile}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
            composerTextareaRef={composerTextareaRef}
            composerText={composerText}
            setComposerText={setComposerText}
            handleComposerKeyDown={handleComposerKeyDown}
            handleComposerPaste={handleComposerPaste}
            composerPlaceholderName={composerPlaceholderName}
            composerIsPending={composerIsPending}
            composerCanSubmit={composerCanSubmit}
            composerSubmitEnabled={composerSubmitEnabled}
            onSubmit={(e) => { e.preventDefault(); submitComposer(); }}
          />
        )}
      </div>

      {mountedChatModals}
    </>
  );
};
