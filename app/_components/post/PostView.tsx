"use client";

import { useQuery } from "@tanstack/react-query";
import PostCard from "./PostCard";
import { getPostAction } from "@/app/_actions/postAction";
import { PostType } from "@/types/post";

export default function PostViewClient({
  initialPost,
}: {
  initialPost: PostType;
}) {
  const { data: post } = useQuery({
    queryKey: ["post", initialPost.id],
    queryFn: async () => {
      const res = await getPostAction(initialPost.id);
      if (!res.success || !res.data) {
        throw new Error("Post not found");
      }
      return res.data;
    },
    initialData: initialPost,
    staleTime: 1000 * 30,
  });

  return <PostCard post={post!} view />;
}
