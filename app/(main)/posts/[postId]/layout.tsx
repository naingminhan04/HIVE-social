import { createMetadata } from "@/app/seo";

type PostLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ postId: string }>;
};

export const metadata = createMetadata({
  title: "Post",
  description: "View post on HIVE.",
  path: "/posts",
  type: "article",
});

const PostLayout = ({ children }: PostLayoutProps) => children;

export default PostLayout;
