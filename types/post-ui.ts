import type { PostType } from "./post";
import type { UserType } from "./user";

export type PostCardProps = {
  post: PostType;
  view: boolean;
};

export type PostContentProps = {
  post: PostType;
  view: boolean;
};

export type PostMenuProps = {
  post: PostType;
  view: boolean;
  onDeletingChange: (value: boolean) => void;
};

export type PostReelProps = {
  userId?: string;
  scrollContainerId?: string;
};

export type PostViewNavProps = {
  user: UserType;
};

export type PostViewClientProps = {
  initialPost: PostType;
};
