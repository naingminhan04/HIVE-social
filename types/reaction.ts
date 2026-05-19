import type { PostType, ReactionCountType, ReactionType } from "./post";

export type ReactionFilter = ReactionType | "ALL";

export type ReactionOption = {
  key: Exclude<keyof ReactionCountType, "total">;
  type: ReactionType;
  src: string;
};

export type ReactionBtnProps = {
  post: PostType;
};

export type AddReactionMutationInput = {
  postId: string;
  reaction: ReactionType;
};

export type ViewReactionProps = {
  post: PostType;
};

export type ReactionPageProps = {
  postId: string;
  reaction: ReactionFilter;
};
