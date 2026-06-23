import { Metadata } from "./post";

export interface UserResponseType {
  metadata: Metadata;
  users: UserType[];
}

export interface UserType {
  id: string;
  email: string;
  name: string;
  username: string;
  points : number;
  profilePic: string | null;
  isVerified: boolean;
  bio: string | null;
  createdAt: string;
  updatedAt:string;
  hasPassword: boolean;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  postsCount: number;
  likesCount: number;
  coverPic: string | null;
  googleId: string | null;
}

export interface UniqueUsernameResponseType {
  message: string;
  isUnique: boolean;
}
