import { useEffect, useRef, useLayoutEffect } from "react";
import type { Dispatch, SetStateAction, RefObject } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { SmilePlus, Reply, Edit3, Trash2 } from "lucide-react";
import type { ChatMessage, ChatReactionType } from "@/types/chat";
import type { UseMutationResult } from "@tanstack/react-query";

export const reactionOptions: { type: ChatReactionType; label: string; image: string }[] = [
  { type: "LIKE", label: "Like", image: "/like.png" },
  { type: "LOVE", label: "Love", image: "/love.png" },
  { type: "HAHA", label: "Haha", image: "/haha.png" },
  { type: "WOW", label: "Wow", image: "/wow.png" },
  { type: "SAD", label: "Sad", image: "/sad.png" },
  { type: "ANGRY", label: "Angry", image: "/angry.png" },
];

export const reactionStatKeys: Record<ChatReactionType, keyof NonNullable<ChatMessage["reactionStats"]>> = {
  LIKE: "like",
  LOVE: "love",
  HAHA: "haha",
  WOW: "wow",
  SAD: "sad",
  ANGRY: "angry",
};

type MessageActionsProps = {
  isMine: boolean;
  message: ChatMessage;
  currentReaction: ChatReactionType | null;
  openReactionMessageId: string | null;
  setOpenReactionMessageId: Dispatch<SetStateAction<string | null>>;
  onReply: (message: ChatMessage) => void;
  startEditing: (message: ChatMessage) => void;
  deleteMutation: UseMutationResult<string, Error, string>;
  reactionMutation: UseMutationResult<
    { messageId: string; reactionType: ChatReactionType | null },
    Error,
    { messageId: string; reactionType: ChatReactionType; currentReaction?: ChatReactionType | null }
  >;
  isDeleting: boolean;
};

type ReactionPickerProps = {
  anchorRef: RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  isMine: boolean;
  currentReaction: ChatReactionType | null;
  isPending: boolean;
  onClose: () => void;
  onSelect: (reactionType: ChatReactionType) => void;
};

function ReactionPicker({ anchorRef, isOpen, isMine, currentReaction, isPending, onClose, onSelect }: ReactionPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const anchor = anchorRef.current;
    const picker = pickerRef.current;
    if (!anchor || !picker) return;

    const viewport = anchor.closest("[data-chat-messages-viewport]") as HTMLElement | null;
    const anchorRect = anchor.getBoundingClientRect();
    const viewportRect = viewport?.getBoundingClientRect() ?? { top: 0, left: 8, right: window.innerWidth - 8, bottom: window.innerHeight };
    const pickerWidth = picker.offsetWidth || 280;
    const pickerHeight = picker.offsetHeight || 48;
    const edgePadding = 8;

    const spaceAbove = anchorRect.top - viewportRect.top;
    const spaceBelow = viewportRect.bottom - anchorRect.bottom;
    const openBelow = spaceAbove < pickerHeight + edgePadding && spaceBelow > spaceAbove;

    let left = isMine ? anchorRect.right - pickerWidth : anchorRect.left;
    const maxLeft = viewportRect.right - pickerWidth - edgePadding;
    const minLeft = viewportRect.left + edgePadding;
    left = Math.max(minLeft, Math.min(left, maxLeft));
    const top = openBelow ? anchorRect.bottom + edgePadding : anchorRect.top - pickerHeight - edgePadding;

    picker.style.top = `${top}px`;
    picker.style.left = `${left}px`;
    picker.style.visibility = "visible";
    picker.style.pointerEvents = "auto";
  }, [anchorRef, isMine, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (pickerRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [anchorRef, isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={pickerRef}
      data-chat-reaction-picker=""
      style={{ top: 0, left: 0, visibility: "hidden", pointerEvents: "none" }}
      className="fixed z-120 flex w-max max-w-[min(18rem,calc(100vw-1rem))] gap-0.5 overflow-x-auto rounded-full border border-black/10 bg-white p-1 shadow-xl scrollbar-none dark:border-white/10 dark:bg-neutral-900"
      onMouseLeave={(e) => {
        const related = e.relatedTarget;
        if (related instanceof Element && pickerRef.current?.contains(related)) return;
        if (related instanceof Element && anchorRef.current?.contains(related)) return;
        onClose();
      }}
    >
      {reactionOptions.map((r) => (
        <button key={r.type} type="button" disabled={isPending} onClick={() => onSelect(r.type)} className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-neutral-100 active:scale-95 disabled:opacity-50 dark:hover:bg-neutral-800 ${currentReaction === r.type ? "bg-blue-50 ring-1 ring-blue-400 dark:bg-blue-500/10" : ""}`} aria-label={`React ${r.label}`} title={r.label}>
          <Image src={r.image} alt={r.label} width={24} height={24} className="h-6 w-6" />
        </button>
      ))}
    </div>,
    document.body,
  );
}

export function MessageActions({ isMine, message, currentReaction, openReactionMessageId, setOpenReactionMessageId, onReply, startEditing, deleteMutation, reactionMutation, isDeleting }: MessageActionsProps) {
  const reactButtonRef = useRef<HTMLButtonElement>(null);
  const isPickerOpen = openReactionMessageId === message.id;

  return (
    <div className="relative hidden shrink-0 items-center self-center rounded-lg border border-black/10 bg-white p-0.5 text-neutral-600 opacity-0 shadow-lg transition group-hover/message:opacity-100 group-focus-within/message:opacity-100 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300 lg:flex">
      <div className="relative">
        <button ref={reactButtonRef} type="button" onClick={() => setOpenReactionMessageId((prev) => (prev === message.id ? null : message.id))} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="React to message" title="React" aria-expanded={isPickerOpen}>
          <SmilePlus size={16} />
        </button>
        <ReactionPicker
          anchorRef={reactButtonRef}
          isOpen={isPickerOpen}
          isMine={isMine}
          currentReaction={currentReaction}
          isPending={reactionMutation.isPending}
          onClose={() => setOpenReactionMessageId(null)}
          onSelect={(reactionType) => {
            setOpenReactionMessageId(null);
            reactionMutation.mutate({ messageId: message.id, reactionType, currentReaction });
          }}
        />
      </div>
      <button type="button" onClick={() => onReply(message)} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Reply to message" title="Reply">
        <Reply size={16} />
      </button>
      {isMine && (
        <>
          <button type="button" onClick={() => startEditing(message)} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Edit message" title="Edit">
            <Edit3 size={15} />
          </button>
          <button type="button" disabled={isDeleting} onClick={() => deleteMutation.mutate(message.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30" aria-label="Delete message" title="Delete">
            <Trash2 size={15} />
          </button>
        </>
      )}
    </div>
  );
}
