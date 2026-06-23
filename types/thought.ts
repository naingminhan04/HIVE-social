import type { UserType } from "./user";

export type ThoughtUser = Pick<
  UserType,
  "id" | "name" | "username" | "profilePic"
> & {
  profilePicId?: string | null;
};

export type Thought = {
  id: string;
  userId: string;
  text: string;
  expiresAt: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  user: ThoughtUser;
};

export type CreateThoughtResponse = {
  message: string;
  thought: Thought;
};

export type ActiveThoughtResponse = {
  thought: Thought | null;
};

export type DeleteThoughtResponse = {
  message: string;
  thoughtId: string;
};
