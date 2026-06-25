import type { Chat, DraftPrivateChat, SelectedChat } from "@/types/chat";

export const isDraftChat = (chat: SelectedChat | null): chat is DraftPrivateChat =>
  chat?.type === "PRIVATE_DRAFT";

const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const isVideoMessageMedia = (media: { mimeType?: string; fileName?: string }) =>
  media.mimeType?.toLowerCase().startsWith("video/") ||
  /\.(mp4|webm|mov|m4v|ogg)$/i.test(media.fileName ?? "");

const getGroupSenderPreviewName = (name?: string | null) => {
  const trimmedName = name?.trim() ?? "";
  return trimmedName.length > 15 ? `${trimmedName.slice(0, 15)}...` : trimmedName;
};

const getAttachmentPreview = (message: Chat["lastMessage"]) => {
  if (!message) return "";
  if (message.voiceMessage) return "Sent a voice message";

  const media = message.images ?? [];
  if (media.length > 0) {
    const videos = media.filter(isVideoMessageMedia).length;
    const photos = media.length - videos;

    if (videos > 0 && photos > 0) {
      return `Sent ${pluralize(photos, "photo")} and ${pluralize(videos, "video")}`;
    }
    if (videos > 0) return videos === 1 ? "Sent a video" : `Sent ${videos} videos`;
    return photos === 1 ? "Sent a photo" : `Sent ${photos} photos`;
  }

  const attachments = message.attachments ?? [];
  if (attachments.length > 0) {
    const firstFileName = attachments[0]?.fileName?.trim();
    if (attachments.length === 1 && firstFileName) return firstFileName;
    return `Sent ${pluralize(attachments.length, "attachment")}`;
  }

  return "Attachment";
};

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

  const content = message.content?.trim() || getAttachmentPreview(message);
  if (message.senderId === viewerId) return `You: ${content}`;
  if (chat.type === "GROUP") {
    const senderName = getGroupSenderPreviewName(message.sender?.name);
    return senderName ? `${senderName}: ${content}` : content;
  }
  return content;
};

export const getPanelSubtitle = (chat: SelectedChat | Chat) => {
  if (isDraftChat(chat)) return `@${chat.user.username}`;
  if (chat.type === "GROUP") return `${chat.participantsCount} members`;
  return `@${chat.otherUser?.user.username ?? "user"}`;
};
