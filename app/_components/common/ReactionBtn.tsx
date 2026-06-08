"use client";

import {
  PostType,
  ReactionType,
  PostsResponseType,
} from "@/types/post";
import {
  addReactionAction,
  removeReactionAction,
} from "@/app/_actions/reaction";
import { formatCount } from "../post/PostCard";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ThumbsUp } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

interface ReactionBtnProps {
  post: PostType;
}

const reactionHoverMap: Record<ReactionType, string> = {
  LIKE: "hover:bg-blue-500/20",
  HAHA: "hover:bg-yellow-400/20",
  WOW: "hover:bg-purple-500/20",
  SAD: "hover:bg-indigo-500/20",
  ANGRY: "hover:bg-red-500/20",
  LOVE: "hover:bg-pink-500/20",
};

const reactionImageMap: Record<ReactionType, string> = {
  LIKE: "/like.png",
  HAHA: "/haha.png",
  WOW: "/wow.png",
  SAD: "/sad.png",
  ANGRY: "/angry.png",
  LOVE: "/love.png",
};

let hasPreloadedReactionAssets = false;

export default function ReactionBtn({ post }: ReactionBtnProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const btnRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const reactionState = post.reaction
    ? post.reaction.reactionType
    : null;

  useEffect(() => {
    if (hasPreloadedReactionAssets || typeof window === "undefined") return;

    Object.values(reactionImageMap).forEach((src) => {
      const image = new window.Image();
      image.src = src;
    });

    hasPreloadedReactionAssets = true;
  }, []);

  /* ================= CLOSE ON OUTSIDE CLICK ================= */
  useEffect(() => {
    if (!open) return;

    const handler = (e: MouseEvent) => {
      if (
        btnRef.current?.contains(e.target as Node) ||
        panelRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /* ================= CLOSE ON SCROLL ================= */
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("wheel", close, { passive: true });
    window.addEventListener("touchmove", close, { passive: true });
    return () => {
      window.removeEventListener("wheel", close);
      window.removeEventListener("touchmove", close);
    };
  }, [open]);

  /* ================= HELPERS ================= */
  const updateAllPostLists = (
    postId: string,
    updater: (p: PostType) => void
  ) => {
    queryClient.setQueriesData<{
      pages: PostsResponseType[];
    }>({ queryKey: ["posts"] }, (old) => {
      if (!old?.pages) return old;
      const next = structuredClone(old);
      next.pages.forEach((page) =>
        page.posts.forEach((p) => {
          if (p.id === postId) updater(p);
        })
      );
      return next;
    });
  };

  const updateSinglePost = (
    postId: string,
    updater: (p: PostType) => void
  ) => {
    queryClient.setQueryData<PostType>(["post", postId], (old) => {
      if (!old) return old;
      const next = structuredClone(old);
      updater(next);
      return next;
    });
  };

  /* ================= ADD REACTION ================= */
  const addMutation = useMutation({
    mutationFn: async ({
      postId,
      reaction,
    }: {
      postId: string;
      reaction: ReactionType;
    }) => {
      const result = await addReactionAction(postId, reaction);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },

    onMutate: async ({ postId, reaction }) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });

      const apply = (p: PostType) => {
        const prev = p.reaction?.reactionType ?? null;

        if (prev) {
          const k = prev.toLowerCase() as keyof typeof p.stats.reactions;
          p.stats.reactions[k] = Math.max(0, p.stats.reactions[k] - 1);
        } else {
          p.stats.reactions.total += 1;
        }

        const nextKey =
          reaction.toLowerCase() as keyof typeof p.stats.reactions;
        p.stats.reactions[nextKey] += 1;

        p.reaction = {
          id: "optimistic",
          userId: "",
          postId: p.id,
          reactionType: reaction,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: { id: "", name: "", username: "", profilePic: null }
        };
      };

      updateAllPostLists(postId, apply);
      updateSinglePost(postId, apply);
    },

    onError: (e: Error) => {
      toast.error(e.message);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["post", post.id] });
      queryClient.invalidateQueries({
        queryKey: ["post-reactions", post.id],
      });
    },
  });

  /* ================= REMOVE REACTION ================= */
  const removeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const result = await removeReactionAction(postId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },

    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });

      const apply = (p: PostType) => {
        if (!p.reaction) return;

        const key =
          p.reaction.reactionType.toLowerCase() as keyof typeof p.stats.reactions;

        p.stats.reactions[key] = Math.max(0, p.stats.reactions[key] - 1);
        p.stats.reactions.total = Math.max(
          0,
          p.stats.reactions.total - 1
        );

        p.reaction = null;
      };

      updateAllPostLists(postId, apply);
      updateSinglePost(postId, apply);
    },

    onError: (e: Error) => {
      toast.error(e.message);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["post", post.id] });
      queryClient.invalidateQueries({
        queryKey: ["post-reactions", post.id],
      });
    },
  });

  /* ================= UI ================= */
  return (
    <div ref={btnRef} className="relative flex items-center rounded-xl">
      {reactionState ? (
        <button
          onClick={() => removeMutation.mutate(post.id)}
          className="flex items-center justify-center px-2 h-10 gap-1 rounded-xl hover:bg-blue-300 active:bg-blue-300 dark:hover:bg-neutral-500 dark:active:bg-neutral-500 active:scale-95 transition-all"
        >
          <Image
            src={reactionImageMap[reactionState]}
            alt={reactionState}
            width={18}
            height={18}
          />
          {post.stats.reactions.total > 0 && (
            <span className="text-sm">
              {formatCount(post.stats.reactions.total)}
            </span>
          )}
        </button>
      ) : (
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center px-3 h-10 gap-1 hover:bg-blue-300 active:bg-blue-300 dark:hover:bg-neutral-500 dark:active:bg-neutral-500 rounded-xl active:scale-95 transition"
        >
          <ThumbsUp size={18} />
          {post.stats.reactions.total > 0 && (
            <span className="text-sm">
              {formatCount(post.stats.reactions.total)}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          className="absolute bottom-full left-0 mb-2 z-40 flex gap-1 px-2 py-2 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-150"
        >
          {Object.values(ReactionType).map((reaction) => (
            <button
              key={reaction}
              onClick={() => {
                setOpen(false);
                addMutation.mutate({ postId: post.id, reaction });
              }}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition hover:scale-125 ${reactionHoverMap[reaction]}`}
            >
              <Image
                src={reactionImageMap[reaction]}
                alt={reaction}
                width={26}
                height={26}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
