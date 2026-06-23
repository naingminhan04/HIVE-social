import type { UserType } from "./user";

export type ProfileViewUser = Pick<
  UserType,
  "id" | "name" | "username" | "profilePic"
>;

export type ProfileViewItem = {
  id: string;
  viewerId: string;
  profileId: string;
  createdAt: string;
  user: ProfileViewUser | null;
};

export type ProfileViewsResponse = {
  metadata: {
    page: number;
    size: number;
    nextPage: number | null;
    totalPages: number;
    total: number;
  };
  views: ProfileViewItem[];
};

export type CreateProfileViewResponse = {
  message: string;
  view: ProfileViewItem;
};
