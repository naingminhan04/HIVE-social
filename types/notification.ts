import type { UserType } from "./user";

export type NotificationActor = Pick<
  UserType,
  "id" | "name" | "username" | "profilePic"
>;

export type NotificationItem = {
  id: string;
  type: string;
  access: string;
  text: string | null;
  actorUser: NotificationActor | null;
  isRead: boolean;
  postId: string | null;
  commentId: string | null;
  messageId: string | null;
  profileViewId: string | null;
  pointTransactionId: string | null;
  target: {
    post: { id: string } | null;
    comment: { id: string; post?: { id: string } | null } | null;
    message: { id: string; chatId?: string } | null;
    profileView: {
      profile?: { username?: string | null } | null;
    } | null;
    pointTransaction: unknown | null;
    postReaction: { post?: { id: string } | null } | null;
    commentReaction: { comment?: { post?: { id: string } | null } | null } | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type NotificationsResponse = {
  data: NotificationItem[];
  metadata: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
    nextPage: number | null;
  };
  totalUnreadCount: number;
};

export type NotificationUnreadCountResponse = {
  totalUnreadCount: number;
};
