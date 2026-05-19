import { PostType } from "./post";

export interface SearchUserType {
  id: string;
  name: string;
  username: string;
  profilePic: string | null;
}

export interface SearchResponseType {
  posts: PostType[];
  users: SearchUserType[];
  totalPosts: number;
  totalUsers: number;
}

export type SearchTab = "posts" | "users";

export type SearchResultsProps = {
  keyword: string;
};

export type SearchButtonFormValues = {
  keyword: string;
};
