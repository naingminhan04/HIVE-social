import type { Metadata } from "next";
import { createMetadata } from "@/app/seo";

type PostLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ postId: string }>;
};

export const generateMetadata = async ({
  params,
}: Omit<PostLayoutProps, "children">): Promise<Metadata> => {
  const { postId } = await params;

  return createMetadata({
    title: "Post",
    description:
      "Open this HIVE post to view the full conversation, reactions, comments, and shared media.",
    path: `/posts/${encodeURIComponent(postId)}`,
    type: "article",
  });
};

const PostLayout = ({ children }: PostLayoutProps) => children;

export default PostLayout;
