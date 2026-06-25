import React from "react";
import type { RefObject } from "react";
import { Edit3, X, Reply, Mic, FileText, Play, Paperclip, Loader2, Send } from "lucide-react";
import RecoverableImage from "../common/RecoverableImage";
import type { ChatMessage, ChatMedia } from "@/types/chat";
import type { DraftFile } from "./ChatHelpers";
import { getMediaKind } from "./ChatHelpers";
import { isVideoObjectUrl } from "@/utils/videoThumbnail";

const composerFieldClass =
  "max-h-28 min-h-11 min-w-0 flex-1 resize-none overflow-y-auto rounded-2xl border border-gray-300 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition scrollbar-none focus:border-2 focus:border-black dark:border-neutral-700 dark:bg-black dark:text-neutral-100 dark:focus:border-white";

const composerBannerClass =
  "mb-2 flex min-w-0 items-center gap-2 rounded-lg border border-gray-300 border-l-4 border-l-blue-300 bg-blue-50 px-3 py-2 text-xs text-neutral-800 dark:border-neutral-700 dark:border-l-neutral-500 dark:bg-neutral-900 dark:text-neutral-100";

const composerBannerDismissClass =
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 dark:active:bg-black";

type ChatComposerProps = {
  isEditing: boolean;
  clearComposer: () => void;
  replyToMessage: ChatMessage | null;
  setReplyToMessage: (msg: ChatMessage | null) => void;
  updateReplyMsgIdInUrl: (id: string | null) => void;

  // Existing media being edited (if editing)
  editingImages: ChatMedia[];
  setEditingImages: React.Dispatch<React.SetStateAction<ChatMedia[]>>;
  editingAttachments: ChatMedia[];
  setEditingAttachments: React.Dispatch<React.SetStateAction<ChatMedia[]>>;

  // Draft files
  draftFiles: DraftFile[];
  removeDraftFile: (id: string) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;

  // Text area & submission
  composerTextareaRef: RefObject<HTMLTextAreaElement | null>;
  composerText: string;
  setComposerText: (text: string) => void;
  handleComposerKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleComposerPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void;

  composerPlaceholderName: string;
  composerIsPending: boolean;
  composerCanSubmit: boolean;
  composerSubmitEnabled: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export function ChatComposer({
  isEditing,
  clearComposer,
  replyToMessage,
  setReplyToMessage,
  updateReplyMsgIdInUrl,
  editingImages,
  setEditingImages,
  editingAttachments,
  setEditingAttachments,
  draftFiles,
  removeDraftFile,
  fileInputRef,
  handleFileChange,
  composerTextareaRef,
  composerText,
  setComposerText,
  handleComposerKeyDown,
  handleComposerPaste,
  composerPlaceholderName,
  composerIsPending,
  composerCanSubmit,
  composerSubmitEnabled,
  onSubmit,
}: ChatComposerProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="ios-keyboard-docked sticky bottom-0 z-20 shrink-0 border-t border-black/5 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm dark:border-white/10 dark:bg-neutral-950/95 sm:px-4"
    >
      {isEditing && (
        <div className={composerBannerClass}>
          <Edit3 size={14} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">Editing message</span>
          <button type="button" onClick={clearComposer} className={composerBannerDismissClass} aria-label="Cancel edit">
            <X size={14} />
          </button>
        </div>
      )}
      {replyToMessage && (
        <div className={composerBannerClass}>
          <Reply size={14} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">{replyToMessage.content || "Replying to attachment"}</span>
          <button type="button" onClick={() => { setReplyToMessage(null); updateReplyMsgIdInUrl(null); }} className={composerBannerDismissClass} aria-label="Cancel reply">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Existing media being edited */}
      {isEditing && (editingImages.length > 0 || editingAttachments.length > 0) && (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[...editingImages, ...editingAttachments].map((media) => {
            const kind = getMediaKind(media);
            const mediaKey = media.id ?? media.key;
            return (
              <div key={mediaKey} className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-neutral-100 dark:border-white/10 dark:bg-neutral-900">
                {kind === "image" && (media.url || media.thumbnailUrl) && (
                  <RecoverableImage src={media.url || media.thumbnailUrl} alt={media.fileName} fill sizes="6rem" className="object-cover" wrapperClassName="h-full w-full" showLoadingOverlay />
                )}
                {kind === "video" && (media.url || media.thumbnailUrl) && (
                  <div className="relative h-full w-full bg-black">
                    <video
                      src={media.url || media.thumbnailUrl}
                      className="h-full w-full object-cover"
                      preload="metadata"
                      playsInline
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-white"><Play size={20} fill="currentColor" /></div>
                  </div>
                )}
                {(kind === "audio" || kind === "file") && (
                  <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
                    {kind === "audio" ? <Mic size={18} /> : <FileText size={18} />}
                    <span className="line-clamp-2 break-all">{media.fileName}</span>
                  </div>
                )}
                <button type="button" onClick={() => { setEditingImages((prev) => prev.filter((m) => (m.id ?? m.key) !== mediaKey)); setEditingAttachments((prev) => prev.filter((m) => (m.id ?? m.key) !== mediaKey)); }} className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75" aria-label="Remove existing attachment">
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Draft files preview */}
      {draftFiles.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {draftFiles.map((df) => (
            <div key={df.id} className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-neutral-100 dark:border-white/10 dark:bg-neutral-900">
              {df.kind === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={df.previewUrl} alt={df.file.name} className="h-full w-full object-cover" />
              )}
              {df.kind === "video" && (
                df.posterUrl && !isVideoObjectUrl(df.posterUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={df.posterUrl}
                    alt={df.file.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="relative h-full w-full bg-black">
                    <video
                      src={df.previewUrl}
                      className="h-full w-full object-cover"
                      preload="metadata"
                      playsInline
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <Play size={20} fill="currentColor" />
                    </div>
                  </div>
                )
              )}
              {(df.kind === "audio" || df.kind === "file") && (
                <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
                  {df.kind === "audio" ? <Mic size={18} /> : <FileText size={18} />}
                  <span className="line-clamp-2 break-all">{df.file.name}</span>
                </div>
              )}
              <button type="button" onClick={() => removeDraftFile(df.id)} className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75" aria-label="Remove attachment">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" />
        <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-600 transition hover:bg-blue-100 active:bg-blue-200 dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-200" aria-label="Attach media" title="Attach media">
          <Paperclip size={18} />
        </button>
        <textarea
          ref={composerTextareaRef}
          value={composerText}
          onChange={(e) => setComposerText(e.target.value)}
          onKeyDown={handleComposerKeyDown}
          onPaste={handleComposerPaste}
          placeholder={isEditing ? "Edit message" : `Message ${composerPlaceholderName}`}
          rows={1}
          className={composerFieldClass}
        />
        <button
          type="submit"
          disabled={composerIsPending || !composerCanSubmit || !composerSubmitEnabled}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-400 text-white transition hover:bg-blue-500 active:bg-blue-600 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          aria-label="Send message"
        >
          {composerIsPending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
        </button>
      </div>
    </form>
  );
}
