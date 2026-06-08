"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import PostCard from "./PostCard";
import { getAllPostAction } from "@/app/_actions/postAction";
import { PostType } from "@/types/post";
import DummyPostCard from "./DummyPostCard";
import toast from "react-hot-toast";
import PullToRefresh from "react-simple-pull-to-refresh";

const LIMIT = 10;
const textOrder = [2, 2, 1, 1, 2];
const imageOrder = [3, 1, 4, 3, 2];

const PostReel = ({
  userId,
  scrollContainerId,
}: {
  userId?: string;
  scrollContainerId?: string;
}) => {
  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["posts", userId ?? "all"],
    queryFn: async ({ pageParam = 1 }) => {
      const result = await getAllPostAction(pageParam, LIMIT, userId);
      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
    getNextPageParam: (lastPage) => lastPage.metadata.nextPage ?? undefined,
    initialPageParam: 1,
  });

  const handleRefresh = async () => {
    scrollToTop();
    return toast.promise(
      refetch(),
      {
        loading: "Refreshing the feed",
        success: "Feed updated!",
        error: "Error refreshing feed",
      },
      {
        id: "feed-refresh",
      },
    );
  };

  const scrollToTop = () => {
    if (scrollContainerId) {
      const scrollContainer = document.getElementById(scrollContainerId);
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        root: scrollContainerId
          ? document.getElementById(scrollContainerId)
          : null,
        rootMargin: "5000px",
      },
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, scrollContainerId]);

  if (isLoading) {
    return (
      <div className="flex flex-col w-full gap-2 p-2 lg:h-dvh h-[calc(100dvh-60px)] overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <DummyPostCard key={i} text={textOrder[i]} image={imageOrder[i]} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className=" w-full h-[calc(100dvh-60px)] p-2 lg:h-dvh">
        <div className="bg-white dark:bg-neutral-900 flex flex-col justify-center items-center gap-4 w-full h-full">
          <div className="text-center text-red-600 dark:text-red-400">
            <p className="text-lg font-semibold mb-2">Failed to load posts</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {error.message}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-400 dark:bg-black active:scale-95 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <PullToRefresh
      pullingContent={
        <div className="flex justify-center items-center m-2">
          Pull to refresh the feed
        </div>
      }
      onRefresh={handleRefresh}
      isPullable={isTouchDevice && !userId}
    >
      <div className="flex flex-col w-full gap-2 p-2 overscroll-contain">
        {posts.length === 0 && !isLoading ? (
          <div className="flex flex-col justify-center items-center w-full h-full p-4">
            <p className="text-gray-500 dark:text-gray-400">No posts yet</p>
          </div>
        ) : (
          <>
            {posts.map((post: PostType) => (
              <PostCard key={post.id} post={post} view={false} />
            ))}

            {hasNextPage ? (
              <div
                ref={loadMoreRef}
                className={`h-10 flex justify-center items-center ${isFetchingNextPage && "w-full h-auto"}`}
              >
                {isFetchingNextPage && <DummyPostCard text={2} image={1} />}
              </div>
            ) : (
              <div className="flex w-full justify-between items-center rounded-xl p-2 bg-white dark:bg-neutral-900 text-gray-500 dark:text-gray-400 text-sm">
                <span>You have reached the end</span>{" "}
                <button
                  onClick={userId ? scrollToTop : handleRefresh}
                  className="bg-blue-400 dark:bg-white active:scale-98 transition-all text-neutral-50 dark:text-black rounded-md p-2"
                >
                  {userId ? "Scroll to top" : "Refresh the feed"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PullToRefresh>
  );
};

export default PostReel;
