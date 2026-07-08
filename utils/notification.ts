import type { NotificationItem } from "@/types/notification";

const isThoughtNotification = (notification: NotificationItem) => {
  const text = notification.text?.toLowerCase() ?? "";
  return text.includes("shared a thought");
};

export function getNotificationHref(notification: NotificationItem): string | null {
  if (notification.postId) {
    return `/posts/${notification.postId}`;
  }

  const reactionPostId =
    notification.target.postReaction?.post?.id ??
    notification.target.commentReaction?.comment?.post?.id;
  if (reactionPostId) {
    return `/posts/${reactionPostId}`;
  }

  const commentPostId = notification.target.comment?.post?.id;
  if (notification.commentId && commentPostId) {
    return `/posts/${commentPostId}`;
  }

  const chatId = notification.target.message?.chatId;
  if (notification.messageId && chatId) {
    return `/chat/${chatId}`;
  }

  // Profile view notifications - don't route anywhere
  if (notification.profileViewId) {
    return null;
  }

  if (isThoughtNotification(notification) && notification.actorUser?.username) {
    return `/users/${notification.actorUser.username}`;
  }

  return null;
}
