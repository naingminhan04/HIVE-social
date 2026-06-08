import { getPostAction } from "@/app/_actions/postAction";
import { notFound } from "next/navigation";
import { CommentPage } from "@/app/_components/common/Comment";
import PostViewClient from "@/app/_components/post/PostView";
import PostViewNav from "@/app/_components/post/PostViewNav";

export default async function PostView({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  const result = await getPostAction(postId);
  if (!result.success || !result.data) notFound();

  return (
    <div className="flex relative flex-col lg:min-h-dvh min-h-[calc(100dvh-64px)] w-full gap-2 px-2">
      <div className="sticky top-15 lg:top-0 z-10 -mx-2 md:mx-0">
        <PostViewNav user={result.data.author} />
      </div>
      <PostViewClient initialPost={result.data} />
      <CommentPage postId={postId} />
    </div>
  );
}
