import OverlayPortal from "../layout/OverlayPortal";
import RecoverableImage from "../common/RecoverableImage";
import Image from "next/image";
import Link from "next/link";
import { X, Loader2 } from "lucide-react";
import { reactionOptions } from "./MessageActions";
import { useState } from "react";
import type { ChatReaction, ChatReactionType } from "@/types/chat";

type ReactionsModalProps = {
  onClose: () => void;
  isLoading: boolean;
  reactions: ChatReaction[];
  currentUserId?: string;
  isRemovingOwnReaction?: boolean;
  onRemoveOwnReaction: (reactionType: ChatReactionType) => void;
};

export function ReactionsModal({
  onClose,
  isLoading,
  reactions,
  currentUserId,
  isRemovingOwnReaction = false,
  onRemoveOwnReaction,
}: ReactionsModalProps) {
  const [activeFilter, setActiveFilter] = useState<ChatReactionType | "ALL">("ALL");
  const reactionCounts = reactionOptions.reduce((acc, option) => {
    acc[option.type] = reactions.filter((r) => r.reactionType === option.type).length;
    return acc;
  }, {} as Record<ChatReactionType, number>);
  const totalReactions = reactions.length;

  const filteredReactions = activeFilter === "ALL" 
    ? reactions 
    : reactions.filter((r) => r.reactionType === activeFilter);

  return (
    <OverlayPortal>
      <div className="pointer-events-auto fixed inset-0 z-[130] flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center">
        <div className="flex h-[min(42rem,100dvh)] w-full flex-col bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 md:max-w-xl md:rounded-2xl">
          <div className="flex items-center justify-between border-b border-gray-300 pb-4 px-4 pt-4 dark:border-neutral-800">
            <div>
              <h2 className="text-lg font-semibold">Reactions</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                See who reacted to this message
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-gray-200 px-4 py-2 transition hover:bg-gray-300 active:scale-95 dark:bg-neutral-800 dark:hover:bg-neutral-700"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto overflow-y-hidden scrollbar-none p-4 pt-4">
            <button
              onClick={() => setActiveFilter("ALL")}
              className={`mx-1 h-10 w-15 shrink-0 rounded-xl text-sm font-medium transition ${activeFilter === "ALL" ? "scale-110 bg-blue-300 dark:bg-black" : "bg-gray-200 hover:bg-gray-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"}`}
            >
              All {totalReactions}
            </button>
            {reactionOptions.map((r) => (
              <button
                key={r.type}
                onClick={() => setActiveFilter(r.type)}
                className={`mx-1 flex h-10 w-15 shrink-0 items-center justify-center gap-1 rounded-xl text-sm transition ${activeFilter === r.type ? "scale-110 bg-blue-300 dark:bg-black" : "bg-gray-200 hover:bg-gray-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"}`}
              >
                <Image src={r.image} alt={r.label} width={16} height={16} />
                <span>{reactionCounts[r.type]}</span>
              </button>
            ))}
          </div>

          <div className="mt-2 flex-1 overflow-y-auto overscroll-contain scrollbar-none px-4 pb-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin size-8 text-gray-400" />
              </div>
            ) : filteredReactions.length === 0 ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                No reactions yet.
              </p>
            ) : (
              <div className="divide-y divide-black/5 dark:divide-white/10">
                {filteredReactions.map((reaction) => {
                  const isOwnReaction = reaction.userId === currentUserId;
                  if (isOwnReaction) {
                    return (
                      <button
                        key={reaction.id}
                        type="button"
                        disabled={isRemovingOwnReaction}
                        onClick={() => onRemoveOwnReaction(reaction.reactionType)}
                        className="flex w-full min-w-0 items-center gap-3 py-3 text-left transition hover:bg-neutral-200 active:bg-neutral-200 dark:hover:bg-neutral-900 dark:active:bg-neutral-900"
                      >
                        <RecoverableImage
                          src={reaction.user.profilePic || "/default-avatar.png"}
                          alt={reaction.user.name}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover bg-gray-300"
                          wrapperClassName="h-8 w-8 shrink-0 rounded-full"
                          fallbackSrc="/default-avatar.png"
                          userId={reaction.user.id}
                          showOnlineStatus
                          onlineStatusSize="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-700 dark:text-neutral-100">{reaction.user.name}</p>
                          <p className="truncate text-sm text-neutral-400">
                            @{reaction.user.username}
                            <span className="ml-2 text-xs text-neutral-400">Click to remove emoji</span>
                          </p>
                        </div>
                        <Image
                          src={reactionOptions.find(o => o.type === reaction.reactionType)?.image || "/like.png"}
                          alt={reaction.reactionType}
                          width={28}
                          height={28}
                          className="h-7 w-7 shrink-0"
                        />
                      </button>
                    );
                  }
                  return (
                    <Link
                      key={reaction.id}
                      href={`/users/${encodeURIComponent(reaction.user.username)}`}
                      onClick={onClose}
                      className="flex min-w-0 items-center gap-3 py-3 transition hover:bg-neutral-200 active:bg-neutral-200 dark:hover:bg-neutral-900 dark:active:bg-neutral-900"
                    >
                      <RecoverableImage
                        src={reaction.user.profilePic || "/default-avatar.png"}
                        alt={reaction.user.name}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover bg-gray-300"
                        wrapperClassName="h-8 w-8 shrink-0 rounded-full"
                        fallbackSrc="/default-avatar.png"
                        userId={reaction.user.id}
                        showOnlineStatus
                        onlineStatusSize="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-700 dark:text-neutral-100">{reaction.user.name}</p>
                        <p className="truncate text-sm text-neutral-400">
                          @{reaction.user.username}
                        </p>
                      </div>
                      <Image
                        src={reactionOptions.find(o => o.type === reaction.reactionType)?.image || "/like.png"}
                        alt={reaction.reactionType}
                        width={28}
                        height={28}
                        className="h-7 w-7 shrink-0"
                      />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
