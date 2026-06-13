"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import PostCard from "@/app/_components/post/PostCard";
import DummyPostCard from "@/app/_components/post/DummyPostCard";
import { searchAction } from "@/app/_actions/search";
import { PostType } from "@/types/post";
import type { SearchTab } from "@/types/search";

const INITIAL_LIMIT = 5;
const LIMIT_STEP = 5;
const MAX_LIMIT = 20;
const textOrder = [2, 2, 1];
const imageOrder = [3, 1, 4];

type SearchStateSnapshot = {
  activeTab: SearchTab;
  scrollY: number;
};

const getSearchStateKey = (keyword: string) => `search-state:${keyword}`;

const readSearchState = (keyword: string): SearchStateSnapshot | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(getSearchStateKey(keyword));
    if (!raw) return null;
    return JSON.parse(raw) as SearchStateSnapshot;
  } catch {
    return null;
  }
};

const writeSearchState = (keyword: string, snapshot: SearchStateSnapshot) => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(getSearchStateKey(keyword), JSON.stringify(snapshot));
  } catch {
    // Ignore storage failures.
  }
};

const SearchPage = () => {
  const params = useParams<{ keyword: string }>();
  const routeKeyword = Array.isArray(params.keyword)
    ? params.keyword[0]
    : params.keyword;
  const keyword = useMemo(() => {
    try {
      return decodeURIComponent(routeKeyword ?? "").trim();
    } catch {
      return routeKeyword?.trim() ?? "";
    }
  }, [routeKeyword]);

  if (!keyword) {
    return (
      <main className="min-h-[calc(100dvh-60px)] lg:min-h-dvh bg-white dark:bg-neutral-900 p-4 text-gray-500 dark:text-gray-400">
        Invalid search keyword.
      </main>
    );
  }

  return <SearchResults key={keyword} keyword={keyword} />;
};

const SearchResults = ({ keyword }: { keyword: string }) => {
  const mainRef = useRef<HTMLElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const restoredScrollRef = useRef(false);
  const [activeTab, setActiveTab] = useState<SearchTab>(() => {
    return readSearchState(keyword)?.activeTab ?? "posts";
  });

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    error,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["search", keyword],
    queryFn: async ({ pageParam = INITIAL_LIMIT }) => {
      const result = await searchAction(keyword, pageParam);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    initialPageParam: INITIAL_LIMIT,
    getNextPageParam: (lastPage, allPages) => {
      const nextLimit = INITIAL_LIMIT + allPages.length * LIMIT_STEP;
      if (nextLimit > MAX_LIMIT) return undefined;

      const hasMorePosts =
        lastPage.posts.length < Math.min(lastPage.totalPosts, MAX_LIMIT);
      const hasMoreUsers =
        lastPage.users.length < Math.min(lastPage.totalUsers, MAX_LIMIT);

      if (!hasMorePosts && !hasMoreUsers) return undefined;
      return nextLimit;
    },
    enabled: !!keyword,
    staleTime: 1000 * 60 * 3,
    refetchOnWindowFocus: false,
  });

  const latestPage = data?.pages[data.pages.length - 1];
  const posts = latestPage?.posts ?? [];
  const users = latestPage?.users ?? [];
  const totalPosts = latestPage?.totalPosts ?? 0;
  const totalUsers = latestPage?.totalUsers ?? 0;

  const hasMorePosts = posts.length < Math.min(totalPosts, MAX_LIMIT);
  const hasMoreUsers = users.length < Math.min(totalUsers, MAX_LIMIT);
  const canLoadMore = activeTab === "posts" ? hasMorePosts : hasMoreUsers;

  const showErrorFullPage = Boolean(error && !latestPage);
  const showErrorBanner = Boolean(error && latestPage);
  const showInitialLoading = isLoading && !latestPage && !!keyword;
  const showLoadingMore = isFetchingNextPage && canLoadMore;

  useEffect(() => {
    restoredScrollRef.current = false;
    const saved = readSearchState(keyword);
    if (saved?.activeTab) {
      setActiveTab(saved.activeTab);
    }
  }, [keyword]);

  useEffect(() => {
    if (restoredScrollRef.current || isLoading) return;
    const saved = readSearchState(keyword);
    if (!saved?.scrollY) {
      restoredScrollRef.current = true;
      return;
    }

    requestAnimationFrame(() => {
      window.scrollTo({ top: saved.scrollY, behavior: "auto" });
      restoredScrollRef.current = true;
    });
  }, [isLoading, keyword]);

  useEffect(() => {
    return () => {
      writeSearchState(keyword, {
        activeTab,
        scrollY: window.scrollY,
      });
    };
  }, [activeTab, keyword]);

  useEffect(() => {
    if (!loadMoreRef.current || !canLoadMore || isFetching) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root: null, rootMargin: "120px" },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [canLoadMore, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage]);

  return (
    <main
      ref={mainRef}
      className="min-h-[calc(100dvh-60px)] md:px-2 lg:min-h-dvh"
    >
      <div className="sticky top-15 lg:top-0 z-20 p-2 bg-linear-to-r from-blue-100 to-blue-50 dark:from-neutral-950 dark:to-neutral-900 border-b border-blue-200/80 dark:border-neutral-800">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-blue-200/90 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/90 px-2 py-1.5 backdrop-blur">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 truncate">
            Results for &quot;{keyword}&quot;
          </p>
          <div className="flex items-center rounded-lg border border-blue-200 dark:border-neutral-700 bg-blue-50 dark:bg-neutral-950 p-0.5 shrink-0">
            <button
              onClick={() => setActiveTab("posts")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                activeTab === "posts"
                  ? "bg-blue-500 text-white shadow-sm dark:bg-black"
                  : " hover:bg-blue-100 dark:bg-neutral-800 dark:hover:bg-neutral-900"
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                activeTab === "users"
                  ? "bg-blue-500 text-white shadow-sm dark:bg-black"
                  : " hover:bg-blue-100 dark:bg-neutral-800 dark:hover:bg-neutral-900"
              }`}
            >
              Users
            </button>
          </div>
        </div>
      </div>

      {showErrorFullPage ? (
        <div className="p-4 text-red-600 dark:text-red-400">
          {(error as Error).message}
        </div>
      ) : null}

      {showErrorBanner ? (
        <div className="p-4 text-yellow-700 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300 rounded-lg m-2">
          {(error as Error).message}. Showing cached results while the latest
          search request completes.
        </div>
      ) : null}

      {activeTab === "posts" ? (
        <div className="flex flex-col pt-2">
          <div className="gap-2 flex flex-col">
            {showInitialLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <DummyPostCard
                  key={i}
                  text={textOrder[i]}
                  image={imageOrder[i]}
                />
              ))
            ) : posts.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 p-4">
                No posts found
              </p>
            ) : (
              posts.map((post: PostType) => (
                <PostCard key={post.id} post={post} view={false} />
              ))
            )}
          </div>

          {canLoadMore && hasNextPage ? (
            <div ref={loadMoreRef} className="h-2 w-full" />
          ) : null}

          {showLoadingMore ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <DummyPostCard key={`loading-${i}`} text={2} image={1} />
              ))}
            </div>
          ) : null}

          {!canLoadMore && posts.length >= Math.min(totalPosts, MAX_LIMIT) && posts.length > 0 ? (
            <div className="flex w-full justify-center items-center rounded-xl mt-2 p-4 bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 text-sm">
              <div className="text-center">
                <p className="font-medium mb-1">
                  {(() => {
                    const remaining = Math.max(0, totalPosts - MAX_LIMIT);
                    return remaining > 0
                      ? `And ${remaining}+ posts found. Try being more specific with your search terms.`
                      : "Try being more specific with your search terms to find exactly what you're looking for.";
                  })()}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="p-2 bg-white dark:bg-neutral-900">
          {showInitialLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-neutral-800"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-neutral-700" />
                  <div className="space-y-2">
                    <div className="w-30 h-3 rounded bg-gray-300 dark:bg-neutral-700" />
                    <div className="w-24 h-3 rounded bg-gray-300 dark:bg-neutral-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 p-4">
              No users found
            </p>
          ) : (
            users.map((user) => (
              <Link
                key={user.id}
                href={`/users/${user.username}`}
                className="flex items-center gap-2 p-2 hover:bg-blue-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <Image
                  src={user.profilePic || "/default-avatar.png"}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover bg-gray-300 dark:bg-neutral-700"
                  width={40}
                  height={40}
                />
                <div className="min-w-0">
                  <p className="font-medium truncate">{user.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    @{user.username}
                  </p>
                </div>
              </Link>
            ))
          )}

          {canLoadMore && hasNextPage ? (
            <div ref={loadMoreRef} className="h-2 w-full" />
          ) : null}

          {showLoadingMore ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={`loading-user-${i}`}
                  className="animate-pulse flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-neutral-800"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-neutral-700" />
                  <div className="space-y-2">
                    <div className="w-30 h-3 rounded bg-gray-300 dark:bg-neutral-700" />
                    <div className="w-24 h-3 rounded bg-gray-300 dark:bg-neutral-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!canLoadMore && users.length >= Math.min(totalUsers, MAX_LIMIT) && users.length > 0 ? (
            <div className="flex w-full justify-center items-center rounded-xl p-4 bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 text-sm mt-4">
              <div className="text-center">
                <p className="font-medium mb-1">
                  {(() => {
                    const remaining = Math.max(0, totalUsers - MAX_LIMIT);
                    return remaining > 0
                      ? `And ${remaining}+ users found. Try being more specific with your search terms.`
                      : "Try being more specific with your search terms to find exactly what you're looking for.";
                  })()}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
};

export default SearchPage;
