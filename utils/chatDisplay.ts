import type { Chat, DraftPrivateChat, SelectedChat } from "@/types/chat";

export const isDraftChat = (chat: SelectedChat | null): chat is DraftPrivateChat =>
  chat?.type === "PRIVATE_DRAFT";

export const visibleChatHasMessage = (chat: Chat) =>
  Boolean(chat.lastMessage) || chat.messagesCount > 0;

/** Incoming last message not read by the current user. */
export const chatHasUnread = (chat: Chat, viewerId?: string) => {
  const last = chat.lastMessage;
  if (!last || !viewerId || last.senderId === viewerId) return false;
  return last.isReadByMe !== true;
};

export const getUnreadChatsCount = (chats: Chat[], viewerId?: string) =>
  chats.filter((chat) => chatHasUnread(chat, viewerId)).length;

export const getChatTitle = (chat: SelectedChat | Chat) => {
  if (isDraftChat(chat)) return chat.user.name;
  if (chat.type === "PRIVATE") return chat.otherUser?.user.name ?? chat.name ?? "Private chat";
  return chat.name || "Group chat";
};

export const getChatImage = (chat: SelectedChat | Chat) => {
  if (isDraftChat(chat)) return chat.user.profilePic;
  if (chat.type === "PRIVATE") return chat.otherUser?.user.profilePic ?? null;
  return chat.chatImage;
};

export const getChatSubtitle = (chat: Chat, viewerId?: string) => {
  const message = chat.lastMessage;
  if (!message) {
    return chat.type === "GROUP" ? `${chat.participantsCount} members` : "";
  }

  const content = message.content?.trim() || "Attachment";
  if (message.senderId === viewerId) return `You: ${content}`;
  return content;
};

export const getPanelSubtitle = (chat: SelectedChat | Chat) => {
  if (isDraftChat(chat)) return `@${chat.user.username}`;
  if (chat.type === "GROUP") return `${chat.participantsCount} members`;
  return `@${chat.otherUser?.user.username ?? "user"}`;
};
