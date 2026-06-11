import type { SearchUserType } from "./search";

export type ChatType = "PRIVATE" | "GROUP";
export type ChatParticipantRole = "OWNER" | "ADMIN" | "MEMBER";

export type ChatUser = {
  id: string;
  name: string;
  username: string;
  role?: "USER" | "ADMIN" | "SUPER_ADMIN";
  profilePic: string | null;
  profilePicId?: unknown;
};

export type ChatParticipant = {
  participantId: string;
  userId: string;
  role: ChatParticipantRole;
  joinedAt: string;
  sharePreviousConversation: boolean;
  lastSeen: string | null;
  user: ChatUser;
};

export type ChatMedia = {
  id?: string;
  key: string;
  thumbnailKey?: string;
  url?: string;
  thumbnailUrl?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

export type ChatReactionStats = {
  total: number;
  like: number;
  love: number;
  haha: number;
  wow: number;
  sad: number;
  angry: number;
};

export type ChatReactionType = "LIKE" | "LOVE" | "HAHA" | "WOW" | "SAD" | "ANGRY";

export type ChatReaction = {
  id: string;
  userId: string;
  messageId: string;
  reactionType: ChatReactionType;
  createdAt: string;
  updatedAt: string;
  user: ChatUser;
};

export type ChatMessage = {
  id: string;
  content: string | null;
  voiceMessage?: ChatMedia | null;
  senderId: string;
  isEdited: boolean;
  parentMessageId?: string | null;
  forwardedMessageId?: string | null;
  chatId: string;
  type: "CONTENT" | "SYSTEM";
  systemType?: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  sender: ChatUser;
  parentMessage?: ChatMessage | string | null;
  forwardedMessage?: ChatMessage | string | null;
  images: ChatMedia[];
  attachments: ChatMedia[];
  mentions?: { id: string; userId: string; user: ChatUser }[];
  poll?: unknown;
  reactionStats?: ChatReactionStats;
  myReaction?: ChatReaction | null;
  isRead?: boolean;
  isReadByMe?: boolean;
  readCount?: number;
};

export type Chat = {
  id: string;
  type: ChatType;
  name: string | null;
  description: string | null;
  chatKey: string;
  createdAt: string;
  updatedAt: string;
  chatImage: string | null;
  chatImageId?: string | null;
  participantsCount: number;
  messagesCount: number;
  currentParticipant?: ChatParticipant;
  otherUser?: ChatParticipant;
  lastMessage?: ChatMessage | null;
  participantIds: string[];
};

export type ChatListResponse = {
  chats: Chat[];
  cursors?: Record<string, unknown>;
  hasMore: boolean;
};

export type ChatMessagesResponse = {
  messages: ChatMessage[];
  cursors?: Record<string, unknown>;
  hasMore?: boolean;
  chat: Chat;
};

export type PrivateChatLookupResponse = {
  message: string;
  chat: Chat;
};

export type CreateChatInput = {
  type: ChatType;
  name?: string;
  participantIds: string[];
  chatImage?: {
    key: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  };
  description?: string;
};

export type CreateChatResponse = {
  message: string;
  chat: Chat;
};

export type SendMessageInput = {
  content: string;
  images?: ChatMedia[];
  attachments?: ChatMedia[];
  parentMessageId?: string;
  forwardedMessageId?: string;
  voiceMessage?: ChatMedia;
  mentionedUserIds?: string[];
};

export type SendMessageResponse = {
  message: string;
  data: ChatMessage;
};

export type UpdateMessageResponse = SendMessageResponse;

export type DeleteMessageResponse = {
  message: string;
  messageId: string;
};

export type ReadMessageResponse = {
  chatId: string;
  messageId: string;
  readCounts: number;
};

export type UnreadCountResponse = {
  unreadMessagesCount: number;
};

export type MessageReactionResponse = {
  message: string;
  reaction: ChatReaction;
  stats: ChatReactionStats;
};

export type RemoveMessageReactionResponse = {
  message: string;
  targetId: string;
  userId: string;
  stats: ChatReactionStats;
};

export type MessageReactionStatusResponse = {
  reaction: ChatReaction | null;
};

export type MessageReactionsResponse = {
  metadata?: {
    page: number;
    size: number;
    nextPage?: number | null;
    totalPages: number;
    total: number;
  };
  reactions: ChatReaction[];
  stats: ChatReactionStats;
};

export type ChatSocketConfig = {
  url: string;
  token: string | null;
};

export type DraftPrivateChat = {
  type: "PRIVATE_DRAFT";
  user: SearchUserType;
};

export type SelectedChat = Chat | DraftPrivateChat;

export type ComposeMode = "private" | "group" | null;

export type DraftFileKind = "image" | "video" | "audio" | "file";

export type DraftFile = {
  id: string;
  file: File;
  previewUrl: string;
  kind: DraftFileKind;
};

export type MessageSendStatus = "sending" | "sent" | "read" | "failed";

export type ChatMessagesPage = {
  messages: ChatMessage[];
  cursors: Record<string, unknown> | null;
  hasMore?: boolean;
};

export type MessagesPagePayload = ChatMessagesResponse & { hasMore?: boolean };

export type ChatMessagesQueryOptions = {
  cursor?: string;
  dateCursor?: string;
  idCursor?: string;
  limit?: number;
  direction?: "older" | "newer";
};
