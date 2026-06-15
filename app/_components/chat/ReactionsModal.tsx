import OverlayPortal from "../layout/OverlayPortal";
import RecoverableImage from "../common/RecoverableImage";
import Image from "next/image";
import { X, Loader2 } from "lucide-react";
import { reactionOptions } from "./MessageActions";
import type { ChatReaction } from "@/types/chat";

type ReactionsModalProps = {
  onClose: () => void;
  isLoading: boolean;
  reactions: ChatReaction[];
};

export function ReactionsModal({
  onClose,
  isLoading,
  reactions,
}: ReactionsModalProps) {
  return (
    <OverlayPortal>
      <div className="pointer-events-auto fixed inset-0 z-[120] flex items-end bg-black/40 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
        <div className="max-h-[85dvh] w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-neutral-950">
          <div className="flex h-14 items-center justify-between border-b border-black/5 px-4 dark:border-white/10">
            <h2 className="font-semibold text-slate-700 dark:text-neutral-100">Reactions</h2>
            <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900" aria-label="Close reactions">
              <X size={18} />
            </button>
          </div>
          <div className="max-h-[calc(85dvh-56px)] overflow-y-auto p-4 scrollbar-none">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-neutral-400">
                <Loader2 size={17} className="animate-spin" /><span>Loading reactions...</span>
              </div>
            ) : reactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-400">No reactions yet.</p>
            ) : (
              <div className="divide-y divide-black/5 dark:divide-white/10">
                {reactions.map((reaction) => {
                  const reactionMeta = reactionOptions.find((r) => r.type === reaction.reactionType);
                  return (
                    <div key={reaction.id} className="flex min-w-0 items-center gap-3 py-3">
                      <RecoverableImage src={reaction.user.profilePic || "/default-avatar.png"} alt={reaction.user.name} width={44} height={44} className="h-11 w-11 rounded-full object-cover" wrapperClassName="h-11 w-11 shrink-0 rounded-full" fallbackSrc="/default-avatar.png" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-700 dark:text-neutral-100">{reaction.user.name}</p>
                        <p className="truncate text-sm text-neutral-400">@{reaction.user.username}</p>
                      </div>
                      {reactionMeta && <Image src={reactionMeta.image} alt={reactionMeta.label} width={28} height={28} className="h-7 w-7 shrink-0" />}
                    </div>
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
