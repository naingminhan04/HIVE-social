"use client";

import Image from "next/image";
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { viewReactionAction } from "@/app/_actions/reaction";
import {
  PostType,
  ReactionType,
  ReactionCountType,
  PostReactionType,
} from "@/types/post";
import Link from "next/link";
import OverlayPortal from "../layout/OverlayPortal";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

type ReactionFilter = ReactionType | "ALL";

const REACTIONS: {
  key: Exclude<keyof ReactionCountType, "total">;
  type: ReactionType;
  src: string;
}[] = [
    { key: "like", type: ReactionType.like, src: "/like.png" },
    { key: "love", type: ReactionType.love, src: "/love.png" },
    { key: "wow", type: ReactionType.wow, src: "/wow.png" },
    { key: "haha", type: ReactionType.haha, src: "/haha.png" },
    { key: "angry", type: ReactionType.angry, src: "/angry.png" },
    { key: "sad", type: ReactionType.sad, src: "/sad.png" },
  ];

const ViewReaction = ({ post }: { post: PostType }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ReactionFilter>("ALL");
  useLockBodyScroll(open);

  const stats = post.stats.reactions;

  const sortedReactions = REACTIONS.map((r) => ({
    ...r,
    count: stats[r.key],
  }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center h-10 px-2 rounded-xl hover:bg-blue-300 active:bg-blue-300 dark:hover:bg-neutral-500  dark:active:bg-neutral-500  hover:text-neutral-900 dark:hover:text-neutral-100  -space-x-0.5 transition active:scale-90 ${stats.total === 0 && "hidden"}`}
      >
        {sortedReactions.slice(0, 3).map((r, i) => (
          <span
            key={r.key}
            style={{ zIndex: 3 - i }}
            className="rounded-full ring-1 ring-neutral-900"
          >
            <Image src={r.src} alt={r.key} width={18} height={18} />
          </span>
        ))}
      </button>

      {open && (
        <OverlayPortal>
          <div
            className="fixed inset-0 z-[130] flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center"
            onClick={() => setOpen(false)}
          >
            <div
              className="flex h-[min(42rem,100dvh)] w-full flex-col bg-neutral-100 p-5 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100 md:max-w-xl md:rounded-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-300 pb-4 dark:border-neutral-800">
                <div>
                  <h1 className="text-lg font-semibold">Reactions</h1>
                  <p className="text-xs text-gray-500">
                    See who reacted to this post
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-gray-200 px-4 py-2 transition hover:bg-gray-300 active:scale-90 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                >
                  Close
                </button>
              </div>

              <div className="flex gap-2 overflow-x-scroll overflow-y-hidden scrollbar-none pt-4">
                <button
                  onClick={() => setActive("ALL")}
                  className={`mx-1 h-10 w-15 shrink-0 rounded-xl text-sm font-medium transition ${active === "ALL"
                      ? "scale-110 bg-blue-300 dark:bg-black"
                      : "bg-gray-200 hover:bg-gray-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                    }`}
                >
                  All {stats.total}
                </button>

                {sortedReactions.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setActive(r.type)}
                    className={`mx-1 flex h-10 w-15 shrink-0 items-center justify-center gap-1 rounded-xl text-sm transition ${active === r.type
                        ? "scale-110 bg-blue-300 dark:bg-black"
                        : "bg-gray-200 hover:bg-gray-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                      }`}
                  >
                    <Image src={r.src} alt={r.key} width={16} height={16} />
                    <span>{r.count}</span>
                  </button>
                ))}
              </div>

              <div className="mt-2 flex-1 overflow-y-auto overscroll-contain scrollbar-none">
                <ReactionPage postId={post.id} reaction={active} />
              </div>
            </div>
          </div>
        </OverlayPortal>
      )}
    </>
  );
};

const ReactionPage = ({
  postId,
  reaction,
}: {
  postId: string;
  reaction: ReactionFilter;
}) => {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<PostReactionType>({
      queryKey: ["post-reactions", postId, reaction],
      queryFn: async ({ pageParam = 1 }) => {
        const result = await viewReactionAction(
          postId,
          pageParam as number,
          reaction === "ALL" ? undefined : reaction
        );
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data;
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage) => lastPage.metadata.nextPage ?? undefined,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <span className="w-8 h-8 rounded-full border-2 border-black/30 border-t-black dark:border-white/30 dark:border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {data?.pages.flatMap((page) =>
        page.reactions.map((r) => (
          <Link
            href={`/users/${r.user.username}`}
            target="_blank"
            key={r.id}
            className="flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-neutral-200 active:bg-neutral-200 dark:hover:bg-neutral-950 dark:active:bg-neutral-950 transition-all"
          >
            <div className="relative w-8 h-8 shrink-0">
              <Image
                src={r.user.profilePic ?? "/default-avatar.png"}
                alt={r.user.name}
                fill
                className="rounded-full object-cover bg-gray-300"
              />
              {r.reactionType && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4">
                  <Image
                    src={
                      REACTIONS.find((rx) => rx.type === r.reactionType)?.src ??
                      "/like.png"
                    }
                    alt={r.reactionType}
                    width={16}
                    height={16}
                  />
                </span>
              )}
            </div>

            <span className="text-sm">
              {r.user.name}
            </span>
          </Link>
        ))
      )}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="mx-auto block text-sm text-blue-400 hover:underline"
        >
          {isFetchingNextPage ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
};

export default ViewReaction;
