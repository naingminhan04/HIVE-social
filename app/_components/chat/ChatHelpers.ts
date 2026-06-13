import type {
  Chat,
  ChatMedia,
  ChatMessage,
  ChatMessagesPage,
  MessagesPagePayload,
  MessageSendStatus,
  SelectedChat,
} from "@/types/chat";
import type { SearchUserType } from "@/types/search";
import { isDraftChat } from "@/utils/chatDisplay";
import { getPrivateMessagesAction, getChatMessagesAction } from "@/app/_actions/chat";
import type { UploadedFile } from "@/utils/uploadUtils";

// ─── Constants ───────────────────────────────────────────────────────────────
export const SCROLL_NEAR_BOTTOM_THRESHOLD = 120;
export const MESSAGES_PAGE_SIZE = 20;
export const LOAD_OLDER_SCROLL_THRESHOLD = 80;

export type DraftFileKind = "image" | "video" | "audio" | "file";
export type DraftFile = {
  id: string;
  file: File;
  previewUrl: string;
  posterUrl?: string;
  kind: DraftFileKind;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const getDraftFileKind = (file: File): DraftFileKind => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
};

export const getMediaKind = (media: Pick<ChatMedia, "mimeType">): DraftFileKind => {
  const mimeType = media.mimeType.toLowerCase();
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
};

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const toChatMedia = (file: UploadedFile): ChatMedia => ({
  key: file.key,
  fileName: file.fileName,
  fileSize: file.fileSize,
  mimeType: file.mimeType,
});

export const toMessageInputMedia = (media: ChatMedia): ChatMedia => ({
  key: media.key,
  fileName: media.fileName,
  fileSize: media.fileSize,
  mimeType: media.mimeType,
  ...(media.thumbnailKey ? { thumbnailKey: media.thumbnailKey } : {}),
});

export const getSelectedKey = (chat: SelectedChat | null) => {
  if (!chat) return "none";
  if (isDraftChat(chat)) return `draft-${chat.user.id || chat.user.username}`;
  return chat.id;
};

export const makeDraftUser = (params: URLSearchParams): SearchUserType | null => {
  const id = params.get("userId")?.trim();
  if (!id) return null;
  return {
    id,
    name: params.get("name")?.trim() || params.get("username")?.trim() || "New chat",
    username: params.get("username")?.trim() || id,
    profilePic: params.get("profilePic")?.trim() || null,
  };
};

export const sortMessages = (messages: ChatMessage[]) =>
  [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

export const getOlderCursor = (cursors?: Record<string, unknown> | null): string | null => {
  if (!cursors) return null;
  for (const key of ["older", "before", "prev", "previous", "next", "after", "cursor", "nextCursor", "nextPage"] as const) {
    const value = cursors[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
};

export const getOldestMessageCreatedAt = (messages: ChatMessage[]) =>
  sortMessages(messages)[0]?.createdAt ?? null;

export const inferHasMoreOlder = (page: ChatMessagesPage) => {
  if (page.hasMore === true) return true;
  if (page.hasMore === false) return false;
  return page.messages.length >= MESSAGES_PAGE_SIZE;
};

export const getParentMessageId = (message: ChatMessage) => {
  if (message.parentMessageId) return message.parentMessageId;
  if (message.parentMessage && typeof message.parentMessage === "object") {
    return message.parentMessage.id;
  }
  return null;
};

export const getMessageSendStatus = (
  message: ChatMessage,
  chat: Chat | SelectedChat | null,
  isPending: boolean,
): MessageSendStatus => {
  if (isPending) return "sending";

  if (!isDraftChat(chat) && chat?.type === "GROUP") {
    const requiredReaderCount = Math.max((chat.participantsCount ?? 1) - 1, 1);
    return (message.readCount ?? 0) >= requiredReaderCount ? "read" : "sent";
  }

  if (message.isRead === true) return "read";

  return "sent";
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

export const requestMessagesPage = async (
  chat: SelectedChat,
  options: {
    limit: number;
    direction: "older" | "newer";
    cursor?: string;
    dateCursor?: string;
    idCursor?: string;
  },
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

export const toMessagesPage = (payload: MessagesPagePayload): ChatMessagesPage => {
  const page: ChatMessagesPage = {
    messages: sortMessages(payload.messages ?? []),
    cursors: payload.cursors ?? null,
    hasMore: payload.hasMore,
  };
  if (page.hasMore === undefined) page.hasMore = inferHasMoreOlder(page);
  return page;
};

export const fetchChatMessagesPage = async (
  chat: SelectedChat,
  pageParam?: string,
): Promise<ChatMessagesPage> => {
  const payload = await requestMessagesPage(chat, {
    limit: MESSAGES_PAGE_SIZE,
    direction: "older",
    ...(pageParam ? { dateCursor: pageParam } : {}),
  });
  let page = toMessagesPage(payload);

  const anchorMessage = !pageParam && !isDraftChat(chat) ? chat.lastMessage : null;

  if (anchorMessage && !page.messages.some((m) => m.id === anchorMessage.id)) {
    const anchoredPayload = await requestMessagesPage(chat, {
      limit: MESSAGES_PAGE_SIZE,
      direction: "older",
      idCursor: anchorMessage.id,
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

export const scrollMessageIntoView = (
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
