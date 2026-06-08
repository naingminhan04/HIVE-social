"use client";

import {
  createChatAction,
  deleteMessageAction,
  getChatByIdAction,
  getChatMessagesAction,
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
import OverlayPortal from "@/app/_components/OverlayPortal";
import ImageViewer from "@/app/_components/ImageViewer";
import RecoverableImage from "@/app/_components/RecoverableImage";
import { useAuthStore } from "@/store/auth";
import type {
  Chat,
  ChatMedia,
  ChatMessage,
  ChatMessagesResponse,
  ChatReactionType,
  SendMessageInput,
  SelectedChat,
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
import { uploadFiles, type UploadedFile } from "@/utils/uploadUtils";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseMutationResult,
} from "@tanstack/react-query";
import {
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Edit3,
  FileText,
  Loader2,
  MessageCircle,
  Mic,
  Paperclip,
  PenLine,
  Play,
  Plus,
  Reply,
  Search,
  Send,
  SmilePlus,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { io, type Socket } from "socket.io-client";

// ─── Types ───────────────────────────────────────────────────────────────────

type ComposeMode = "private" | "group" | null;
type DraftFileKind = "image" | "video" | "audio" | "file";
type DraftFile = {
  id: string;
  file: File;
  previewUrl: string;
  kind: DraftFileKind;
};

// Granular send status for each message
type MessageSendStatus = "sending" | "sent" | "read" | "failed";

const reactionOptions: { type: ChatReactionType; label: string; image: string }[] = [
  { type: "LIKE", label: "Like", image: "/like.png" },
  { type: "LOVE", label: "Love", image: "/love.png" },
  { type: "HAHA", label: "Haha", image: "/haha.png" },
  { type: "WOW", label: "Wow", image: "/wow.png" },
  { type: "SAD", label: "Sad", image: "/sad.png" },
  { type: "ANGRY", label: "Angry", image: "/angry.png" },
];

const reactionStatKeys: Record<ChatReactionType, keyof NonNullable<ChatMessage["reactionStats"]>> = {
  LIKE: "like",
  LOVE: "love",
  HAHA: "haha",
  WOW: "wow",
  SAD: "sad",
  ANGRY: "angry",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getDraftFileKind = (file: File): DraftFileKind => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
};

const getMediaKind = (media: Pick<ChatMedia, "mimeType">): DraftFileKind => {
  const mimeType = media.mimeType.toLowerCase();
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const toChatMedia = (file: UploadedFile): ChatMedia => ({
  key: file.key,
  fileName: file.fileName,
  fileSize: file.fileSize,
  mimeType: file.mimeType,
});

const toMessageInputMedia = (media: ChatMedia): ChatMedia => ({
  key: media.key,
  fileName: media.fileName,
  fileSize: media.fileSize,
  mimeType: media.mimeType,
  ...(media.thumbnailKey ? { thumbnailKey: media.thumbnailKey } : {}),
});

const getSelectedKey = (chat: SelectedChat | null) => {
  if (!chat) return "none";
  if (isDraftChat(chat)) return `draft-${chat.user.id || chat.user.username}`;
  return chat.id;
};

const makeDraftUser = (params: URLSearchParams): SearchUserType | null => {
  const id = params.get("userId")?.trim();
  if (!id) return null;
  return {
    id,
    name: params.get("name")?.trim() || params.get("username")?.trim() || "New chat",
    username: params.get("username")?.trim() || id,
    profilePic: params.get("profilePic")?.trim() || null,
  };
};

const sortMessages = (messages: ChatMessage[]) =>
  [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

const getOlderCursor = (cursors?: Record<string, unknown> | null): string | null => {
  if (!cursors) return null;
  for (const key of ["older", "before", "prev", "previous", "next", "after", "cursor", "nextCursor", "nextPage"] as const) {
    const value = cursors[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
};

const getOldestMessageId = (messages: ChatMessage[]) =>
  sortMessages(messages)[0]?.id ?? null;

const inferHasMoreOlder = (page: ChatMessagesPage) => {
  if (page.hasMore === true) return true;
  if (page.hasMore === false) return false;
  return page.messages.length >= MESSAGES_PAGE_SIZE;
};

const getParentMessageId = (message: ChatMessage) => {
  if (message.parentMessageId) return message.parentMessageId;
  if (message.parentMessage && typeof message.parentMessage === "object") {
    return message.parentMessage.id;
  }
  return null;
};

/**
 * Determine the send status of a message I sent.
 * - "sending"  → optimistic pending bubble (not yet confirmed by server)
 * - "sent"     → server confirmed, but not read by recipient yet
 * - "read"     → recipient has read it (isRead true OR readCount > 0 for groups)
 * - "failed"   → (not used here but exported for future use)
 */
const getMessageSendStatus = (
  message: ChatMessage,
  chat: Chat | SelectedChat | null,
  isPending: boolean,
): MessageSendStatus => {
  if (isPending) return "sending";

  // isRead comes from the server on fetch or via socket update
  if (message.isRead === true) return "read";

  // For group chats, readCount > 0 means at least one member has read it
  if (!isDraftChat(chat) && chat && chat.type === "GROUP" && (message.readCount ?? 0) > 0) {
    return "read";
  }

  return "sent";
};

// ─── Constants ───────────────────────────────────────────────────────────────

const SCROLL_NEAR_BOTTOM_THRESHOLD = 120;
const MESSAGES_PAGE_SIZE = 20;
const LOAD_OLDER_SCROLL_THRESHOLD = 80;

// ─── Page types ──────────────────────────────────────────────────────────────

type ChatMessagesPage = {
  messages: ChatMessage[];
  cursors: Record<string, unknown> | null;
  hasMore?: boolean;
};

type MessagesPagePayload = ChatMessagesResponse & { hasMore?: boolean };

// ─── Fetch helpers ────────────────────────────────────────────────────────────

const requestMessagesPage = async (
  chat: SelectedChat,
  options: { limit: number; direction: "older" | "newer"; cursor?: string },
): Promise<MessagesPagePayload> => {
  const primaryResult = isDraftChat(chat)
    ? await getPrivateMessagesAction(chat.user.id, options)
    : chat.type === "PRIVATE" && chat.otherUser
      ? await getPrivateMessagesAction(chat.otherUser.userId, options)
      : await getChatMessagesAction(chat.id, options);

  if (primaryResult.success) return primaryResult.data as MessagesPagePayload;

  if (!isDraftChat(chat) && chat.type === "PRIVATE") {
    const fallbackResult = await getChatMessagesAction(chat.id, options);
    if (fallbackResult.success) return fallbackResult.data as MessagesPagePayload;
  }

  throw new Error(primaryResult.error);
};

const toMessagesPage = (payload: MessagesPagePayload): ChatMessagesPage => {
  const page: ChatMessagesPage = {
    messages: sortMessages(payload.messages ?? []),
    cursors: payload.cursors ?? null,
    hasMore: payload.hasMore,
  };
  if (page.hasMore === undefined) page.hasMore = inferHasMoreOlder(page);
  return page;
};

const fetchChatMessagesPage = async (
  chat: SelectedChat,
  pageParam?: string,
): Promise<ChatMessagesPage> => {
  const payload = await requestMessagesPage(chat, {
    limit: MESSAGES_PAGE_SIZE,
    direction: "older",
    ...(pageParam ? { cursor: pageParam } : {}),
  });
  let page = toMessagesPage(payload);

  const anchorMessage = !pageParam && !isDraftChat(chat) ? chat.lastMessage : null;

  if (anchorMessage && !page.messages.some((m) => m.id === anchorMessage.id)) {
    const anchoredPayload = await requestMessagesPage(chat, {
      limit: MESSAGES_PAGE_SIZE,
      direction: "older",
      cursor: anchorMessage.id,
    });
    const merged = new Map<string, ChatMessage>();
    [...sortMessages(anchoredPayload.messages), anchorMessage].forEach((m) => merged.set(m.id, m));
    page = {
      messages: sortMessages([...merged.values()]),
      cursors: anchoredPayload.cursors ?? page.cursors,
      hasMore: anchoredPayload.hasMore ?? page.hasMore,
    };
    if (page.hasMore === undefined) page.hasMore = inferHasMoreOlder(page);
  }

  return page;
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function ChatMessageSkeleton({ isMine = false }: { isMine?: boolean }) {
  return (
    <div className={`flex animate-pulse gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[60%] space-y-2 rounded-2xl px-3 py-3 ${
          isMine ? "rounded-br-md bg-neutral-200 dark:bg-neutral-800" : "rounded-bl-md bg-neutral-200 dark:bg-neutral-800"
        }`}
      >
        <div className="h-3 w-28 rounded bg-neutral-300 dark:bg-neutral-700" />
        <div className="h-3 w-40 rounded bg-neutral-300/80 dark:bg-neutral-700/80" />
      </div>
    </div>
  );
}

function ChatMessagesLoadingSkeleton() {
  return (
    <div className="space-y-4 py-2">
      <ChatMessageSkeleton />
      <ChatMessageSkeleton isMine />
      <ChatMessageSkeleton />
      <ChatMessageSkeleton isMine />
      <ChatMessageSkeleton />
    </div>
  );
}

/** Visual indicator for sent/read/sending status */
function MessageStatusIcon({ status }: { status: MessageSendStatus }) {
  if (status === "sending") {
    return (
      <span className="inline-flex items-center opacity-60" aria-label="Sending">
        <Clock size={11} />
      </span>
    );
  }
  if (status === "read") {
    return (
      <span className="inline-flex items-center text-blue-200 dark:text-blue-300" aria-label="Read">
        <CheckCheck size={12} />
      </span>
    );
  }
  // "sent"
  return (
    <span className="inline-flex items-center opacity-70" aria-label="Sent">
      <Check size={12} />
    </span>
  );
}

const composerFieldClass =
  "max-h-28 min-h-11 min-w-0 flex-1 resize-none overflow-y-auto rounded-2xl border border-gray-300 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition scrollbar-none focus:border-2 focus:border-black dark:border-neutral-700 dark:bg-black dark:text-neutral-100 dark:focus:border-white";

const composerBannerClass =
  "mb-2 flex min-w-0 items-center gap-2 rounded-lg border border-gray-300 border-l-4 border-l-blue-300 bg-blue-50 px-3 py-2 text-xs text-neutral-800 dark:border-neutral-700 dark:border-l-neutral-500 dark:bg-neutral-900 dark:text-neutral-100";

const composerBannerDismissClass =
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 dark:active:bg-black";

const scrollMessageIntoView = (
  viewport: HTMLElement,
  messageId: string,
  behavior: ScrollBehavior = "smooth",
) => {
  const target = viewport.querySelector<HTMLElement>(`[data-chat-message-id="${messageId}"]`);
  if (!target) return false;
  const viewportRect = viewport.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const nextTop = viewport.scrollTop + (targetRect.top - viewportRect.top) - 16;
  viewport.scrollTo({ top: Math.max(nextTop, 0), behavior });
  return true;
};

// ─── Main component ───────────────────────────────────────────────────────────

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
  // Track which message IDs have been read so we update their status in cache
  const [socketReadMessageIds, setSocketReadMessageIds] = useState<Set<string>>(new Set());

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

      socketRef.current = socket;
      socket.on("connect", () => setIsSocketConnected(true));
      socket.on("disconnect", () => setIsSocketConnected(false));

      // ── Incoming new message: insert into cache + update chat list ──
      const handleIncomingMessage = (
        payload: ChatMessage | { message: ChatMessage; chatId?: string },
      ) => {
        try {
          const message = "message" in payload ? payload.message : payload as ChatMessage;
          const chatId = ("chatId" in payload ? (payload as { chatId?: string }).chatId : undefined) ?? message?.chatId;
          if (!chatId || !message?.id) return;

          const ak = activeKeyRef.current;

          // Insert the message into the active chat's infinite cache
          if (ak && ak !== "none" && message.senderId !== viewer?.id) {
            queryClient.setQueryData<InfiniteData<ChatMessagesPage>>(
              ["chatMessages", ak],
              (current) => {
                if (!current || current.pages.length === 0) return current;
                // Deduplicate
                const alreadyExists = current.pages.some((p) =>
                  p.messages.some((m) => m.id === message.id),
                );
                if (alreadyExists) return current;
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

          // Update chat list to show latest message + bubble to top
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

      // ── Message updated: patch in cache ──
      const handleMessageUpdated = (
        payload: ChatMessage | { message: ChatMessage; chatId?: string },
      ) => {
        try {
          const message = "message" in payload ? payload.message : payload as ChatMessage;
          if (!message?.id) return;
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
                  messages: page.messages.map((m) => (m.id === message.id ? message : m)),
                })),
              };
            },
          );
        } catch {
          // ignore
        }
      };

      // ── Message deleted: mark as deleted in cache ──
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

      // ── Message read: update isRead on sender's messages in cache ──
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
          // Don't process our own read events
          if (readerId && readerId === viewer?.id) return;

          const ak = activeKeyRef.current;
          if (!ak || ak === "none") return;

          // Update specific message if we have its ID
          if (messageId) {
            setSocketReadMessageIds((prev) => new Set([...prev, messageId]));
            queryClient.setQueryData<InfiniteData<ChatMessagesPage>>(
              ["chatMessages", ak],
              (current) => {
                if (!current) return current;
                return {
                  ...current,
                  pages: current.pages.map((page) => ({
                    ...page,
                    messages: page.messages.map((m) =>
                      m.id === messageId
                        ? { ...m, isRead: true, readCount: (m.readCount ?? 0) + 1 }
                        : m,
                    ),
                  })),
                };
              },
            );
          } else if (chatId) {
            // If only chatId is given, mark all *my* messages as read
            queryClient.setQueryData<InfiniteData<ChatMessagesPage>>(
              ["chatMessages", ak],
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

      socket.on("message:new", handleIncomingMessage);
      socket.on("new-message", handleIncomingMessage);
      socket.on("message-sent", handleIncomingMessage);
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
    // viewer?.id is stable after login
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, setIsSocketConnected, viewer?.id]);

  useEffect(() => { draftFilesRef.current = draftFiles; }, [draftFiles]);

  useEffect(() => {
    return () => {
      draftFilesRef.current.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, []);

  // Join/leave chat room via socket
  useEffect(() => {
    if (!activeChat || isDraftChat(activeChat)) return;
    socketRef.current?.emit("join-chat", { chatId: activeChat.id });
    socketRef.current?.emit("chat:join", activeChat.id);
    return () => {
      socketRef.current?.emit("leave-chat", { chatId: activeChat.id });
      socketRef.current?.emit("chat:leave", activeChat.id);
    };
  }, [activeChat]);

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
        return toMessagesPage(bootstrap.data as MessagesPagePayload);
      }

      return fetchChatMessagesPage(activeChat, pageParam as string | undefined);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.messages.length === 0) return undefined;
      if (!inferHasMoreOlder(lastPage)) return undefined;
      const olderCursor = getOlderCursor(lastPage.cursors);
      if (olderCursor) return olderCursor;
      return getOldestMessageId(lastPage.messages) ?? undefined;
    },
    enabled: Boolean(activeChat) && (!isDraftChat(activeChat) || Boolean(activeChat.user.id)),
  });

  // Reset per-chat state when switching chats
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
    setSocketReadMessageIds(new Set());
  }, [activeKey]);

  // Restore scroll position after loading older messages
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
      // Remove pending bubble
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
      socketRef.current?.emit("message:sent", message);
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

      const readEventChatId = activeChat && !isDraftChat(activeChat) ? activeChat.id : undefined;
      socketRef.current?.emit("message:read", { messageId, chatId: readEventChatId });
      socketRef.current?.emit("message-read", { messageId, chatId: readEventChatId });
      await queryClient.invalidateQueries({ queryKey: ["chatUnreadCount"] });
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

  // Load older messages (scroll up pagination) — captures scroll position first
  const loadOlderMessages = useCallback(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport || messagesQuery.isFetchingNextPage || !messagesQuery.hasNextPage) return;
    // Capture current position BEFORE the fetch so we can restore it after
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

  // IntersectionObserver sentinel for scroll-up pagination
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
        if (chatById.success) { openChat(chatById.data); return; }
        const privateChat = await getPrivateChatByUserIdAction(activeChatId);
        if (privateChat.success) { openChat(privateChat.data.chat); return; }
        const userResult = await getUserAction(activeChatId);
        if (userResult.success) { openChat({ type: "PRIVATE_DRAFT", user: userToDraftChatUser(userResult.data) }); return; }
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

  // ── Auto-mark incoming messages as read ──
  useEffect(() => {
    const unread = messages.filter(
      (m) => m.senderId !== viewer?.id && !m.isReadByMe && !readMessageIdsRef.current.has(m.id),
    );
    unread.forEach((m) => {
      readMessageIdsRef.current.add(m.id);
      markReadMutation.mutate(m.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, viewer?.id]);

  // ── Jump-to-message effect ──
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

  // ── Auto-scroll to bottom on new messages (if near bottom) ──
  useLayoutEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!activeChat || !viewport || messagesQuery.isPending) return;
    // Skip if we're restoring scroll position from older-messages load
    if (pendingScrollPreserveRef.current !== null) return;

    const isInitialPosition = lastPositionedChatRef.current !== activeKey;
    if (isInitialPosition) {
      viewport.scrollTop = viewport.scrollHeight;
      lastPositionedChatRef.current = activeKey;
      isNearBottomRef.current = true;
      setShowScrollToBottom(false);
      return;
    }

    // Scroll to bottom when sending a new message
    if (sendMutation.isPending) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "auto" });
      isNearBottomRef.current = true;
      setShowScrollToBottom(false);
      return;
    }

    // Only auto-scroll if the user is near the bottom
    if (isNearBottomRef.current) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      setShowScrollToBottom(false);
    }
  }, [activeChat, activeKey, messages, messagesQuery.isPending, sendMutation.isPending]);

  // ── Composer state ──
  const composerSubmitEnabled =
    Boolean(activeChat) && (!isDraftChat(activeChat) || Boolean(activeChat.user.id));

  const selectedUserIds = useMemo(
    () => new Set(groupUsers.map((u) => u.id)),
    [groupUsers],
  );

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
    setDraftFiles((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        kind: getDraftFileKind(file),
      })),
    ]);
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
    return reactionOptions
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

  const renderMediaItem = (media: ChatMedia, mediaGroup?: ChatMedia[], index = 0) => {
    const kind = getMediaKind(media);
    const url = media.url || media.thumbnailUrl;
    if (kind === "image" && url) {
      return (
        <button
          key={media.id ?? media.key}
          type="button"
          onClick={() => openMessageMediaViewer(mediaGroup ?? [media], index)}
          className="block max-w-full overflow-hidden rounded-lg bg-neutral-200 text-left dark:bg-neutral-800"
        >
          <RecoverableImage
            src={url}
            alt={media.fileName}
            width={520}
            height={360}
            className="max-h-72 w-full object-cover"
            wrapperClassName="block max-w-full overflow-hidden rounded-lg"
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
        className="flex min-w-0 items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-xs hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
      >
        <FileText size={16} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{media.fileName}</span>
        <span className="shrink-0 opacity-60">{formatFileSize(media.fileSize)}</span>
      </a>
    );
  };

  // ── Computed values ──
  const isMessagesLoading =
    Boolean(activeChat) && messages.length === 0 && (messagesQuery.isPending || messagesQuery.isFetching);
  const composerPlaceholderName = activeChat ? getChatTitle(activeChat) : "chat";
  const isRouteResolving = Boolean(activeChatId && !activeChat && isResolvingRoute);

  // ── Modals ──
  const chatModals = (
    <>
      {composeMode && (
        <OverlayPortal>
          <div className="fixed inset-0 z-130 flex items-end bg-black/40 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
            <div className="max-h-[85dvh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-950">
              <div className="flex h-14 items-center justify-between border-b border-black/5 px-4 dark:border-white/10">
                <h2 className="font-semibold">{composeMode === "private" ? "New Chat" : "New Group"}</h2>
                <button type="button" onClick={() => setComposeMode(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[calc(85dvh-56px)] overflow-y-auto p-4 scrollbar-none">
                {composeMode === "private" ? (
                  <>
                    <div className="flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-neutral-50 px-3 dark:border-white/10 dark:bg-neutral-900">
                      <Search size={17} className="text-neutral-400" />
                      <input value={privateSearch} onChange={(e) => setPrivateSearch(e.target.value)} placeholder="Search people" className="min-w-0 flex-1 bg-transparent text-base outline-none" style={{ fontSize: 16 }} />
                    </div>
                    <div className="mt-3 divide-y divide-black/5 dark:divide-white/10">
                      {privateSearchQuery.isLoading ? (
                        <p className="py-6 text-center text-sm text-neutral-400">Searching...</p>
                      ) : privateSearch.trim().length === 0 ? (
                        <p className="py-6 text-center text-sm text-neutral-400">Start typing to search people.</p>
                      ) : privateSearchResults.length === 0 ? (
                        <p className="py-6 text-center text-sm text-neutral-400">No users found.</p>
                      ) : (
                        privateSearchResults.map((user) => (
                          <button key={user.id} type="button" onClick={() => openPrivateDraft(user)} className="flex w-full min-w-0 items-center gap-3 py-3 text-left">
                            <RecoverableImage src={user.profilePic || "/default-avatar.png"} alt={user.name} width={44} height={44} className="h-11 w-11 rounded-full object-cover" wrapperClassName="h-11 w-11 shrink-0 rounded-full" fallbackSrc="/default-avatar.png" />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">{user.name}</span>
                              <span className="block truncate text-sm text-neutral-400">@{user.username}</span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" className="h-11 w-full rounded-xl border border-black/10 bg-neutral-50 px-3 text-base outline-none focus:border-blue-400 dark:border-white/10 dark:bg-neutral-900" style={{ fontSize: 16 }} />
                    {groupUsers.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {groupUsers.map((user) => (
                          <button key={user.id} type="button" onClick={() => toggleGroupUser(user)} className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-neutral-900 dark:text-neutral-100">
                            <span className="truncate">{user.name}</span>
                            <X size={12} />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-neutral-50 px-3 dark:border-white/10 dark:bg-neutral-900">
                      <Search size={17} className="text-neutral-400" />
                      <input value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} placeholder="Add people" className="min-w-0 flex-1 bg-transparent text-base outline-none" style={{ fontSize: 16 }} />
                    </div>
                    <div className="mt-3 divide-y divide-black/5 dark:divide-white/10">
                      {groupSearch.trim().length === 0 ? (
                        <p className="py-6 text-center text-sm text-neutral-400">Start typing to add people.</p>
                      ) : groupSearchQuery.isLoading ? (
                        <p className="py-6 text-center text-sm text-neutral-400">Searching...</p>
                      ) : groupSearchResults.length === 0 ? (
                        <p className="py-6 text-center text-sm text-neutral-400">No users found.</p>
                      ) : (
                        groupSearchResults.map((user) => (
                          <button key={user.id} type="button" onClick={() => toggleGroupUser(user)} className="flex w-full min-w-0 items-center gap-3 py-3 text-left">
                            <RecoverableImage src={user.profilePic || "/default-avatar.png"} alt={user.name} width={44} height={44} className="h-11 w-11 rounded-full object-cover" wrapperClassName="h-11 w-11 shrink-0 rounded-full" fallbackSrc="/default-avatar.png" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold">{user.name}</span>
                              <span className="block truncate text-sm text-neutral-400">@{user.username}</span>
                            </span>
                            <span className={`h-5 w-5 rounded-full border ${selectedUserIds.has(user.id) ? "border-blue-400 bg-blue-400" : "border-neutral-300 dark:border-neutral-600"}`} />
                          </button>
                        ))
                      )}
                    </div>
                    <button type="button" disabled={createGroupMutation.isPending} onClick={() => createGroupMutation.mutate()} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-400 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50 dark:bg-white dark:text-black">
                      {createGroupMutation.isPending ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
                      <span>Create Group</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </OverlayPortal>
      )}

      {reactionUsersMessage && (
        <OverlayPortal>
          <div className="fixed inset-0 z-130 flex items-end bg-black/40 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
            <div className="max-h-[85dvh] w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-neutral-950">
              <div className="flex h-14 items-center justify-between border-b border-black/5 px-4 dark:border-white/10">
                <h2 className="font-semibold text-slate-700 dark:text-neutral-100">Reactions</h2>
                <button type="button" onClick={() => setReactionUsersMessage(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900" aria-label="Close reactions">
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[calc(85dvh-56px)] overflow-y-auto p-4 scrollbar-none">
                {reactionUsersQuery.isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-neutral-400">
                    <Loader2 size={17} className="animate-spin" /><span>Loading reactions...</span>
                  </div>
                ) : (reactionUsersQuery.data?.reactions ?? []).length === 0 ? (
                  <p className="py-8 text-center text-sm text-neutral-400">No reactions yet.</p>
                ) : (
                  <div className="divide-y divide-black/5 dark:divide-white/10">
                    {(reactionUsersQuery.data?.reactions ?? []).map((reaction) => {
                      const reactionMeta = reactionOptions.find((r) => r.type === reaction.reactionType);
                      return (
                        <div key={reaction.id} className="flex min-w-0 items-center gap-3 py-3">
                          <RecoverableImage src={reaction.user.profilePic || "/default-avatar.png"} alt={reaction.user.name} width={44} height={44} className="h-11 w-11 rounded-full object-cover" wrapperClassName="h-11 w-11 shrink-0 rounded-full" fallbackSrc="/default-avatar.png" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-700 dark:text-neutral-100">{reaction.user.name}</p>
                            <p className="truncate text-sm text-neutral-400">@{reaction.user.username}</p>
                          </div>
                          {reactionMeta && <Image src={reactionMeta.image} alt={reactionMeta.label} width={28} height={28} className="h-7 w-7 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </OverlayPortal>
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
    </>
  );

  const mountedChatModals = hasMounted ? chatModals : null;

  if (!showPanel && !hasMounted) return null;

  if (!showPanel) {
    return (
      <>
        <OverlayPortal>
          <div className="absolute bottom-5 right-5 z-30">
            <div className="relative">
              {isComposeMenuOpen && (
                <div className="absolute bottom-full right-0 mb-3 w-44 overflow-hidden rounded-lg border border-black/10 bg-white py-1 text-sm shadow-xl dark:border-white/10 dark:bg-neutral-900">
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
            className="flex-1 space-y-3 overflow-y-auto bg-neutral-50 px-3 py-4 pb-5 scrollbar-none dark:bg-neutral-950 sm:px-4"
          >
            {/* Sentinel for scroll-up older message loading */}
            <div ref={loadOlderSentinelRef} className="h-px w-full shrink-0" aria-hidden />

            {/* Loading spinner at the top when fetching older messages */}
            {messagesQuery.isFetchingNextPage && (
              <div className="flex justify-center py-3">
                <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-neutral-500 shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-400">
                  <Loader2 size={13} className="animate-spin" />
                  <span>Loading older messages…</span>
                </div>
              </div>
            )}

            {/* "No more messages" indicator at the top */}
            {!messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage && messages.length > 0 && (
              <div className="flex justify-center py-2">
                <span className="rounded-full border border-black/5 bg-white px-3 py-1 text-xs text-neutral-400 dark:border-white/10 dark:bg-neutral-900">
                  Beginning of conversation
                </span>
              </div>
            )}

            {/* Messages */}
            {combinedMessages.map((message) => {
              const isMine = message.senderId === viewer?.id;
              const currentReaction = getCurrentReaction(message);
              const reactionTotal = getReactionTotal(message);
              const visibleReactions = getVisibleReactions(message);
              const isDeleting = deletingMessageIds.includes(message.id);
              const isPendingSend = message.id.startsWith("pending-");
              const sendStatus = isMine
                ? getMessageSendStatus(message, activeChat, isPendingSend)
                : null;

              return (
                <div
                  key={message.id}
                  data-chat-message-id={message.id}
                  className={`group/message flex items-center gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                  onMouseLeave={(event) => {
                    const related = event.relatedTarget;
                    if (related instanceof Element) {
                      if (event.currentTarget.contains(related)) return;
                      if (related.closest("[data-chat-reaction-picker]")) return;
                    }
                    if (openReactionMessageId === message.id) setOpenReactionMessageId(null);
                  }}
                >
                  {isMine && !message.isDeleted && !isDeleting && !isPendingSend && (
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

                  <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                    <div
                      className={`relative rounded-2xl px-3 py-2 text-sm transition-shadow ${
                        isMine
                          ? "rounded-br-md bg-blue-400 text-white dark:bg-neutral-700"
                          : "rounded-bl-md bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                      } ${isDeleting || isPendingSend ? "opacity-60" : ""} ${
                        highlightedMessageId === message.id ? "ring-2 ring-blue-300/90 dark:ring-white/35" : ""
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
                              className={`w-full border-l-2 py-1 pl-2 text-left text-xs transition hover:opacity-90 disabled:cursor-default disabled:hover:opacity-100 ${
                                isMine
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

                      {/* Timestamp + status indicator */}
                      <p className={`mt-1 flex items-center justify-end gap-1 text-right text-[10px] ${isMine ? "text-white/70" : "text-neutral-400"}`}>
                        {message.isEdited && !message.isDeleted && <span>edited</span>}
                        <span>{formatDate(message.createdAt, false, true)}</span>
                        {isMine && sendStatus && <MessageStatusIcon status={sendStatus} />}
                      </p>
                    </div>

                    {/* Reaction pill */}
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

                  {!isMine && !message.isDeleted && !isDeleting && (
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

        {/* Scroll-to-bottom button */}
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

        {/* Composer */}
        {showPanel && (
          <form
            onSubmit={(e) => { e.preventDefault(); submitComposer(); }}
            className="sticky bottom-0 z-20 border-t border-black/5 bg-white/95 p-3 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95"
          >
            {isEditing && (
              <div className={composerBannerClass}>
                <Edit3 size={14} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">Editing message</span>
                <button type="button" onClick={clearComposer} className={composerBannerDismissClass} aria-label="Cancel edit">
                  <X size={14} />
                </button>
              </div>
            )}
            {replyToMessage && (
              <div className={composerBannerClass}>
                <Reply size={14} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{replyToMessage.content || "Replying to attachment"}</span>
                <button type="button" onClick={() => { setReplyToMessage(null); updateReplyMsgIdInUrl(null); }} className={composerBannerDismissClass} aria-label="Cancel reply">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Existing media being edited */}
            {isEditing && (editingImages.length > 0 || editingAttachments.length > 0) && (
              <div className="mb-2 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {[...editingImages, ...editingAttachments].map((media) => {
                  const kind = getMediaKind(media);
                  const mediaKey = media.id ?? media.key;
                  return (
                    <div key={mediaKey} className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-neutral-100 dark:border-white/10 dark:bg-neutral-900">
                      {kind === "image" && (media.url || media.thumbnailUrl) && (
                        <RecoverableImage src={media.url || media.thumbnailUrl} alt={media.fileName} fill className="object-cover" wrapperClassName="h-full w-full" showLoadingOverlay />
                      )}
                      {kind === "video" && (media.url || media.thumbnailUrl) && (
                        <div className="relative h-full w-full bg-black">
                          <video src={media.url || media.thumbnailUrl} className="h-full w-full object-cover" preload="metadata" />
                          <div className="absolute inset-0 flex items-center justify-center text-white"><Play size={20} fill="currentColor" /></div>
                        </div>
                      )}
                      {(kind === "audio" || kind === "file") && (
                        <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
                          {kind === "audio" ? <Mic size={18} /> : <FileText size={18} />}
                          <span className="line-clamp-2 break-all">{media.fileName}</span>
                        </div>
                      )}
                      <button type="button" onClick={() => { setEditingImages((prev) => prev.filter((m) => (m.id ?? m.key) !== mediaKey)); setEditingAttachments((prev) => prev.filter((m) => (m.id ?? m.key) !== mediaKey)); }} className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75" aria-label="Remove existing attachment">
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Draft files preview */}
            {draftFiles.length > 0 && (
              <div className="mb-2 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {draftFiles.map((df) => (
                  <div key={df.id} className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-neutral-100 dark:border-white/10 dark:bg-neutral-900">
                    {df.kind === "image" && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={df.previewUrl} alt={df.file.name} className="h-full w-full object-cover" />
                    )}
                    {df.kind === "video" && <video src={df.previewUrl} className="h-full w-full object-cover" />}
                    {(df.kind === "audio" || df.kind === "file") && (
                      <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
                        {df.kind === "audio" ? <Mic size={18} /> : <FileText size={18} />}
                        <span className="line-clamp-2 break-all">{df.file.name}</span>
                      </div>
                    )}
                    <button type="button" onClick={() => removeDraftFile(df.id)} className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75" aria-label="Remove attachment">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-600 transition hover:bg-blue-100 active:bg-blue-200 dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-200" aria-label="Attach media" title="Attach media">
                <Paperclip size={18} />
              </button>
              <textarea
                ref={composerTextareaRef}
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                onPaste={handleComposerPaste}
                placeholder={isEditing ? "Edit message" : `Message ${composerPlaceholderName}`}
                rows={1}
                className={composerFieldClass}
              />
              <button
                type="submit"
                disabled={composerIsPending || !composerCanSubmit || !composerSubmitEnabled}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-400 text-white transition hover:bg-blue-500 active:bg-blue-600 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                aria-label="Send message"
              >
                {composerIsPending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              </button>
            </div>
          </form>
        )}
      </div>

      {mountedChatModals}
    </>
  );
};

// ─── ChatVideoTile ─────────────────────────────────────────────────────────────

function ChatVideoTile({ media, onOpen }: { media: ChatMedia; onOpen: () => void }) {
  const [isLoading, setIsLoading] = useState(true);
  const src = media.url || media.thumbnailUrl || "";
  return (
    <button type="button" onClick={onOpen} className="relative block max-w-full overflow-hidden rounded-lg bg-black text-left">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/45 text-white">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}
      <video src={src} className="max-h-80 w-full object-cover" preload="metadata" playsInline muted onLoadedData={() => setIsLoading(false)} onError={() => setIsLoading(false)} />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55">
          <Play size={24} fill="currentColor" />
        </span>
      </div>
    </button>
  );
}

// ─── MessageActions ────────────────────────────────────────────────────────────

type MessageActionsProps = {
  isMine: boolean;
  message: ChatMessage;
  currentReaction: ChatReactionType | null;
  openReactionMessageId: string | null;
  setOpenReactionMessageId: Dispatch<SetStateAction<string | null>>;
  onReply: (message: ChatMessage) => void;
  startEditing: (message: ChatMessage) => void;
  deleteMutation: UseMutationResult<string, Error, string>;
  reactionMutation: UseMutationResult<
    { messageId: string; reactionType: ChatReactionType | null },
    Error,
    { messageId: string; reactionType: ChatReactionType; currentReaction?: ChatReactionType | null }
  >;
  isDeleting: boolean;
};

type ReactionPickerProps = {
  anchorRef: RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  isMine: boolean;
  currentReaction: ChatReactionType | null;
  isPending: boolean;
  onClose: () => void;
  onSelect: (reactionType: ChatReactionType) => void;
};

function ReactionPicker({ anchorRef, isOpen, isMine, currentReaction, isPending, onClose, onSelect }: ReactionPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const anchor = anchorRef.current;
    const picker = pickerRef.current;
    if (!anchor || !picker) return;

    const viewport = anchor.closest("[data-chat-messages-viewport]") as HTMLElement | null;
    const anchorRect = anchor.getBoundingClientRect();
    const viewportRect = viewport?.getBoundingClientRect() ?? { top: 0, left: 8, right: window.innerWidth - 8, bottom: window.innerHeight };
    const pickerWidth = picker.offsetWidth || 280;
    const pickerHeight = picker.offsetHeight || 48;
    const edgePadding = 8;

    const spaceAbove = anchorRect.top - viewportRect.top;
    const spaceBelow = viewportRect.bottom - anchorRect.bottom;
    const openBelow = spaceAbove < pickerHeight + edgePadding && spaceBelow > spaceAbove;

    let left = isMine ? anchorRect.right - pickerWidth : anchorRect.left;
    const maxLeft = viewportRect.right - pickerWidth - edgePadding;
    const minLeft = viewportRect.left + edgePadding;
    left = Math.max(minLeft, Math.min(left, maxLeft));
    const top = openBelow ? anchorRect.bottom + edgePadding : anchorRect.top - pickerHeight - edgePadding;

    picker.style.top = `${top}px`;
    picker.style.left = `${left}px`;
    picker.style.visibility = "visible";
    picker.style.pointerEvents = "auto";
  }, [anchorRef, isMine, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (pickerRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [anchorRef, isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={pickerRef}
      data-chat-reaction-picker=""
      style={{ top: 0, left: 0, visibility: "hidden", pointerEvents: "none" }}
      className="fixed z-120 flex w-max max-w-[min(18rem,calc(100vw-1rem))] gap-0.5 overflow-x-auto rounded-full border border-black/10 bg-white p-1 shadow-xl scrollbar-none dark:border-white/10 dark:bg-neutral-900"
      onMouseLeave={(e) => {
        const related = e.relatedTarget;
        if (related instanceof Element && pickerRef.current?.contains(related)) return;
        if (related instanceof Element && anchorRef.current?.contains(related)) return;
        onClose();
      }}
    >
      {reactionOptions.map((r) => (
        <button key={r.type} type="button" disabled={isPending} onClick={() => onSelect(r.type)} className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-neutral-100 active:scale-95 disabled:opacity-50 dark:hover:bg-neutral-800 ${currentReaction === r.type ? "bg-blue-50 ring-1 ring-blue-400 dark:bg-blue-500/10" : ""}`} aria-label={`React ${r.label}`} title={r.label}>
          <Image src={r.image} alt={r.label} width={24} height={24} className="h-6 w-6" />
        </button>
      ))}
    </div>,
    document.body,
  );
}

function MessageActions({ isMine, message, currentReaction, openReactionMessageId, setOpenReactionMessageId, onReply, startEditing, deleteMutation, reactionMutation, isDeleting }: MessageActionsProps) {
  const reactButtonRef = useRef<HTMLButtonElement>(null);
  const isPickerOpen = openReactionMessageId === message.id;

  return (
    <div className="relative flex shrink-0 items-center rounded-lg border border-black/10 bg-white p-0.5 text-neutral-600 opacity-0 shadow-lg transition group-hover/message:opacity-100 group-focus-within/message:opacity-100 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300">
      <div className="relative">
        <button ref={reactButtonRef} type="button" onClick={() => setOpenReactionMessageId((prev) => (prev === message.id ? null : message.id))} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="React to message" title="React" aria-expanded={isPickerOpen}>
          <SmilePlus size={16} />
        </button>
        <ReactionPicker
          anchorRef={reactButtonRef}
          isOpen={isPickerOpen}
          isMine={isMine}
          currentReaction={currentReaction}
          isPending={reactionMutation.isPending}
          onClose={() => setOpenReactionMessageId(null)}
          onSelect={(reactionType) => {
            setOpenReactionMessageId(null);
            reactionMutation.mutate({ messageId: message.id, reactionType, currentReaction });
          }}
        />
      </div>
      <button type="button" onClick={() => onReply(message)} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Reply to message" title="Reply">
        <Reply size={16} />
      </button>
      {isMine && (
        <>
          <button type="button" onClick={() => startEditing(message)} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Edit message" title="Edit">
            <Edit3 size={15} />
          </button>
          <button type="button" disabled={isDeleting} onClick={() => deleteMutation.mutate(message.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30" aria-label="Delete message" title="Delete">
            <Trash2 size={15} />
          </button>
        </>
      )}
    </div>
  );
}