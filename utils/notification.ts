import type { NotificationItem } from "@/types/notification";

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

  const profileUsername = notification.target.profileView?.profile?.username;
  if (notification.profileViewId && profileUsername) {
    return `/users/${profileUsername}?profileViews=1`;
  }

  return null;
}
