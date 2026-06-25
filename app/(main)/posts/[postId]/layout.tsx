import type { Metadata } from "next";
import { getPostAction } from "@/app/_actions/postAction";
import { createMetadata, truncateMetadataText } from "@/app/seo";
import type { PostType } from "@/types/post";

type PostLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ postId: string }>;
};

export const generateMetadata = async ({
  params,
}: Omit<PostLayoutProps, "children">): Promise<Metadata> => {
  const { postId } = await params;
  const result = await getPostAction(postId);

  if (!result.success || !result.data) {
    return createMetadata({
      title: "Post",
      description:
        "Open this HIVE post to view the full conversation, reactions, comments, and shared media.",
      path: `/posts/${encodeURIComponent(postId)}`,
      noIndex: true,
    });
  }

  const post = result.data as PostType;
  const authorName = post.author?.name || post.author?.username || "HIVE";
  const image = post.images?.[0]?.thumbnailUrl || post.images?.[0]?.url;
  const description = truncateMetadataText(
    post.content ||
      `A HIVE post by ${authorName} with reactions, comments, and community conversation.`,
  );

  return createMetadata({
    title: `Post by ${authorName}`,
    description,
    path: `/posts/${encodeURIComponent(post.id)}`,
    image,
    type: "article",
    noIndex: true,
  });
};

const PostLayout = ({ children }: PostLayoutProps) => children;

export default PostLayout;
