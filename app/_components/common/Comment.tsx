"use client";

import { PostType } from "@/types/post";
import {
  MessageCircle,
  SendHorizonal,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  X,
  Camera,
} from "lucide-react";
import { formatCount } from "../post/PostCard";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  addCommentAction,
  getCommentAction,
  deleteCommentAction,
  getReplyAction,
  patchCommentAction,
} from "@/app/_actions/comment";
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AddCommentType,
  CommentResponseType,
  CommentType,
} from "@/types/comment";
import type {
  CommentCardProps,
  RepliesProps,
  CommentFormProps,
  CommentFormMode,
} from "@/types/comment";
import Image from "next/image";
import { isVideoMedia } from "@/utils/media";
import { formatDate } from "@/utils/formatDate";
import { useForm, SubmitHandler } from "react-hook-form";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth";
import { uploadFiles } from "@/utils/uploadUtils";
import ImageViewer from "./ImageViewer";
import DummyComment from "./DummyComment";

const CommentBtn = ({ post, view }: { post: PostType; view: boolean }) => {
  if (view)
    return (
      <div className="flex items-center hover:bg-blue-300 active:bg-blue-300 dark:hover:bg-neutral-500 dark:active:bg-neutral-500 hover:text-black dark:hover:text-white justify-center px-2 h-10 rounded-xl transition active:scale-95">
        <button className="flex gap-1 transition">
          <MessageCircle size={18} />
          {post.stats.comments > 0 && (
            <span>{formatCount(post.stats.comments)}</span>
          )}
        </button>
      </div>
    );

  return (
    <Link
      href={`/posts/${post.id}?focusComments=1`}
      className="flex items-center justify-center px-2 h-10 rounded-xl transition hover:bg-blue-300 active:bg-blue-300 dark:hover:bg-neutral-500 dark:active:bg-neutral-500 hover:text-black dark:hover:text-white active:scale-95"
    >
      <button className="flex gap-1 transition">
        <MessageCircle size={18} />
        {post.stats.comments > 0 && (
          <span>{formatCount(post.stats.comments)}</span>
        )}
      </button>
    </Link>
  );
};

export default CommentBtn;

export const CommentPage = ({ postId }: { postId: string }) => {
  const auth = useAuthStore();
  const userId = auth.user?.id;
  const queryClient = useQueryClient();
  const [isDel, setIsDel] = useState<string[]>([]);
  const [expandedReplies, setExpandedReplies] = useState<string[]>([]);
  const [imageView, setImageView] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const focusCommentsOnLoad = searchParams.get("focusComments") === "1";

  const [activeFormMode, setActiveFormMode] =
    useState<CommentFormMode>("create");
  const [activeComment, setActiveComment] = useState<CommentType | null>(null);
  const commentsContainerRef = useRef<HTMLDivElement | null>(null);

  const openFormForReply = (comment: CommentType) => {
    setActiveFormMode("reply");
    setActiveComment(comment);
  };

  const openFormForEdit = (comment: CommentType) => {
    setActiveFormMode("edit");
    setActiveComment(comment);
  };

  const resetFormState = () => {
    setActiveFormMode("create");
    setActiveComment(null);
  };

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error,
    refetch,
  } = useInfiniteQuery<CommentResponseType>({
    queryKey: ["comments", postId],
    queryFn: async ({ pageParam = 1 }) => {
      const result = await getCommentAction(postId, pageParam as number);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.metadata.nextPage ?? undefined,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (!focusCommentsOnLoad) return;
    if (isLoading || error) return;
    if (!commentsContainerRef.current) return;

    const rect = commentsContainerRef.current.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const offset = 80;

    window.scrollTo({
      top: Math.max(top - offset, 0),
      behavior: "smooth",
    });
  }, [focusCommentsOnLoad, isLoading, error]);

  const handleDelete = async (commentId: string) => {
    setIsDel((prev) => [...prev, commentId]);

    try {
      const result = await deleteCommentAction(commentId);
      if (!result.success) {
        toast.error("Failed to delete comment");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Comment Deleted Successfully");
    } catch (error) {
      toast.error("Failed to delete comment");
    } finally {
      setIsDel((prev) => prev.filter((id) => id !== commentId));
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) =>
      prev.includes(commentId)
        ? prev.filter((id) => id !== commentId)
        : [...prev, commentId],
    );
  };

  if (isLoading) {
    return (
      <div className="mb-2"><DummyComment />
        <DummyComment />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center flex-1 min-h-[10vh] w-full h-full gap-4 p-4">
        <div className="text-center text-red-400">
          <p className="text-lg font-semibold mb-2">Failed to load comments</p>
          <p className="text-sm text-gray-400">
            {error instanceof Error
              ? error.message
              : "An unexpected error occurred"}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-black active:scale-90 text-white rounded-lg transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  const comments = data?.pages.flatMap((page) => page.comments) ?? [];

  return (
    <>
      <div ref={commentsContainerRef} className="flex flex-1 flex-col">
        <main>
          {comments.length === 0 && (
            <p className="text-gray-400 text-center">No comments yet</p>
          )}

          {comments.map((comment) => (
            <div key={comment.id}>
              <CommentCard
                postId={postId}
                comment={comment}
                isDel={isDel}
                isOwner={userId === comment.user.id}
                onDelete={handleDelete}
                onReply={() => openFormForReply(comment)}
                onEdit={() => openFormForEdit(comment)}
                onViewImage={(url) => setImageView(url)}
              />

              {/* Show replies if expanded */}
              {comment.stats.replies > 0 &&
                expandedReplies.includes(comment.id) && (
                  <Replies
                    postId={postId}
                    commentId={comment.id}
                    userId={userId}
                    onReply={openFormForReply}
                    onEdit={openFormForEdit}
                  />
                )}

              {/* Show toggle button for replies */}
              {comment.stats.replies > 0 && (
                <button
                  onClick={() => toggleReplies(comment.id)}
                  className="ml-10 pb-2 text-xs text-blue-500 dark:text-white hover:text-blue-600 dark:hover:text-neutral-300 flex items-center gap-1 transition"
                >
                  {expandedReplies.includes(comment.id) ? (
                    <>
                      <ChevronUp size={14} /> Hide {comment.stats.replies}{" "}
                      {comment.stats.replies === 1 ? "reply" : "replies"}
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} /> Show {comment.stats.replies}{" "}
                      {comment.stats.replies === 1 ? "reply" : "replies"}
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </main>

        {hasNextPage && (
          <div>
            {isFetchingNextPage ? <DummyComment /> : <footer className="p-4 w-full flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="text-blue-400 w-full flex justify-center items-center  dark:text-neutral-50 hover:underline disabled:opacity-50"
              >
                Load More Comments
              </button>
            </footer>}

          </div>

        )}
      </div>
      <div className="pb-2 bg-gray-100 dark:bg-neutral-950 -mx-2 px-2 sticky bottom-0 z-10 pt-2 space-y-2">
        {(activeFormMode === "reply" || activeFormMode === "edit") &&
          activeComment && (
            <div className="flex items-center justify-between text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300">
              <span>
                {activeFormMode === "edit"
                  ? "Editing your comment"
                  : `Replying to ${activeComment.user.name}`}
              </span>
              <button
                type="button"
                onClick={resetFormState}
                className="ml-2 text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                aria-label="Cancel editing or replying"
              >
                <X size={14} />
              </button>
            </div>
          )}

        <CommentForm
          postId={postId}
          mode={activeFormMode}
          targetComment={activeComment ?? undefined}
          commentToEdit={
            activeFormMode === "edit" ? (activeComment ?? undefined) : undefined
          }
          autoFocus={focusCommentsOnLoad}
          onSuccess={resetFormState}
          onCancel={resetFormState}
          onViewImage={(url) => setImageView(url)}
        />
      </div>
      {imageView && (
        <ImageViewer
          images={imageView || []}
          onClose={() => setImageView(null)}
        />
      )}
    </>
  );
};

const CommentCard = ({
  comment,
  isDel,
  isOwner,
  onDelete,
  onReply,
  onEdit,
  onViewImage,
}: CommentCardProps) => {
  return (
    <div
      className={`flex gap-3 px-3 py-2 hover:bg-gray-200 dark:hover:bg-neutral-800 rounded-lg transition ${isDel.includes(comment.id) && "opacity-50 pointer-events-none"
        }`}
    >
      <div className="flex gap-3 flex-1">
        <Link target="_blank" href={`/users/${comment.user.username}`}>
          <Image
            width={8}
            height={8}
            src={comment.user.profilePic || "/default-avatar.png"}
            alt={comment.user.name}
            className="w-8 h-8 rounded-full hover:brightness-85 active:brightness-85 transition-all bg-gray-300 object-cover"
          />
        </Link>

        <div className="flex flex-col flex-1 max-w-[80%]">
          <>
            {/* Comment Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-gray-500 dark:text-neutral-400 text-sm">
                  <Link
                    target="_blank"
                    href={`/users/${comment.user.username}`}
                    className="hover:text-neutral-900 dark:hover:text-gray-300 active:text-neutral-900 dark:active:text-gray-300 transition-all font-semibold"
                  >
                    {comment.user.name}
                  </Link>
                  <span className="font-extralight text-xs mx-2 text-gray-400 dark:text-gray-300">
                    {formatDate(comment.createdAt, false, true)}
                  </span>
                  {comment.isEdited && (
                    <span className="text-xs text-gray-400">[edited]</span>
                  )}
                </p>
              </div>
            </div>

            {/* Comment Content */}
            <p className="whitespace-pre-wrap wrap-break-word text-sm mt-1">
              {comment.content}
            </p>

            {/* Comment Image */}
            {comment.images.length > 0 && (
              <div className="mt-2 overflow-hidden rounded-lg">
                {isVideoMedia(comment.images[0]) ? (
                  <video
                    src={comment.images[0].url}
                    poster={comment.images[0].thumbnailUrl || undefined}
                    controls
                    className="max-w-xs rounded-lg bg-black"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <Image
                    src={comment.images[0].url || "/alt.png"}
                    alt="comment image"
                    width={200}
                    height={200}
                    className="rounded-lg max-w-xs cursor-pointer duration-300 ease-out hover:brightness-90 hover:contrast-105 transition-all"
                    onClick={(e) => {
                      e.stopPropagation(); // prevent triggering reply
                      onViewImage?.(comment.images[0].url);
                    }}
                  />
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 text-xs text-gray-400 mt-2 items-center">
              <button
                onClick={onReply}
                className="hover:text-blue-500 active:text-blue-400 transition-colors"
              >
                Reply
              </button>

              {isOwner && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    className="hover:text-amber-500 active:text-amber-400 transition-colors flex items-center gap-1"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(comment.id);
                    }}
                    className="hover:text-red-500 active:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </>
              )}
            </div>
          </>
        </div>
      </div>
    </div>
  );
};

const Replies = ({
  commentId,
  postId,
  userId,
  onReply,
  onEdit,
}: RepliesProps) => {
  const [isDel, setIsDel] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["replies", commentId],
    queryFn: async () => {
      const result = await getReplyAction(postId, commentId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    refetchOnWindowFocus: false,
  });

  const handleDelete = async (replyId: string) => {
    setIsDel((prev) => [...prev, replyId]);
    try {
      const result = await deleteCommentAction(replyId);
      if (!result.success) {
        toast.error("Failed to delete reply");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["replies", commentId] });
      await queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      toast.success("Reply deleted");
    } catch (err) {
      toast.error("Failed to delete reply");
    } finally {
      setIsDel((prev) => prev.filter((id) => id !== replyId));
    }
  };

  if (isLoading)
    return (
      <div className="ml-10"><DummyComment /></div>

    );

  const replies = (data?.replies ?? data?.comments ?? []) as CommentType[];

  return (
    <div className="ml-10">
      {replies.toReversed().map((reply: CommentType) => (
        <div key={reply.id}>
          <CommentCard
            comment={reply}
            postId={postId}
            isDel={isDel}
            isOwner={userId === reply.user.id}
            onDelete={handleDelete}
            onReply={() => onReply(reply)}
            onEdit={() => onEdit(reply)}
          />
        </div>
      ))}
    </div>
  );
};

export const CommentForm = ({
  postId,
  mode = "create",
  targetComment,
  commentToEdit,
  autoFocus,
  onSuccess,
  onCancel,
  onViewImage,
}: CommentFormProps) => {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    commentToEdit?.images?.[0]?.url || null,
  );

  const isEdit = mode === "edit" && !!commentToEdit;
  const isReply = mode === "reply" && !!targetComment;

  const { register, handleSubmit, reset, watch } = useForm<AddCommentType>({
    defaultValues: {
      content: isEdit && commentToEdit ? commentToEdit.content : "",
      replyId:
        isEdit && commentToEdit
          ? (commentToEdit.replyId ?? null)
          : isReply && targetComment
            ? (targetComment.replyId ?? targetComment.id)
            : null,
      images:
        isEdit && commentToEdit && commentToEdit.images.length > 0
          ? [
            {
              key: commentToEdit.images[0].key,
              fileName: commentToEdit.images[0].fileName,
              mimeType: commentToEdit.images[0].mimeType,
              fileSize: commentToEdit.images[0].fileSize,
            },
          ]
          : [],
    },
  });

  useEffect(() => {
    reset({
      content: isEdit && commentToEdit ? commentToEdit.content : "",
      replyId:
        isEdit && commentToEdit
          ? (commentToEdit.replyId ?? null)
          : isReply && targetComment
            ? (targetComment.replyId ?? targetComment.id)
            : null,
      images:
        isEdit && commentToEdit && commentToEdit.images.length > 0
          ? [
            {
              key: commentToEdit.images[0].key,
              fileName: commentToEdit.images[0].fileName,
              mimeType: commentToEdit.images[0].mimeType,
              fileSize: commentToEdit.images[0].fileSize,
            },
          ]
          : [],
    });
  }, [mode, commentToEdit, targetComment, reset, isEdit, isReply]);

  useEffect(() => {
    // In edit mode, if there's an existing image and no new temp file, show the original image.
    if (
      isEdit &&
      commentToEdit &&
      commentToEdit.images.length > 0 &&
      !selectedFile
    ) {
      setPreviewUrl(commentToEdit.images[0].url || null);
      return;
    }

    // When not editing and there's no newly selected file,
    // always clear the preview so we don't leak edit images into reply/create,
    // or when changing which comment we're replying to.
    if (!isEdit && !selectedFile) {
      setPreviewUrl(null);
    }
  }, [isEdit, commentToEdit, selectedFile, targetComment]);

  // When the \"action\" changes (create ↔ reply ↔ edit, or replying to a different comment),
  // clear any temp-selected file + preview so they don't carry over between actions.
  const actionKeyRef = useRef(
    `${mode}:${targetComment?.id ?? ""}:${commentToEdit?.id ?? ""}`,
  );

  useEffect(() => {
    const nextKey = `${mode}:${targetComment?.id ?? ""}:${commentToEdit?.id ?? ""}`;
    if (actionKeyRef.current !== nextKey) {
      // Action changed (e.g. create -> reply, reply on another comment, create -> edit, or cancel)
      if (selectedFile && previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (selectedFile || !isEdit) {
        // Clear temp-selected file and preview when switching actions.
        setSelectedFile(null);
        setPreviewUrl(null);
      }
      actionKeyRef.current = nextKey;
    }
  }, [mode, targetComment, commentToEdit, isEdit, selectedFile, previewUrl]);

  const content = watch("content");

  const mutation = useMutation({
    mutationFn: async (data: AddCommentType) => {
      let images: Array<{
        key: string;
        fileName: string;
        mimeType: string;
        fileSize: number;
      }> =
        isEdit && commentToEdit && commentToEdit.images.length > 0
          ? [
            {
              key: commentToEdit.images[0].key,
              fileName: commentToEdit.images[0].fileName,
              mimeType: commentToEdit.images[0].mimeType,
              fileSize: commentToEdit.images[0].fileSize,
            },
          ]
          : [];

      if (selectedFile) {
        try {
          const uploadedImages = await uploadFiles([selectedFile]);
          if (uploadedImages && uploadedImages.length > 0) {
            images = [uploadedImages[0]];
          }
        } catch (error) {
          throw new Error(
            error instanceof Error ? error.message : "Failed to upload image",
          );
        }
      }

      if (isEdit && commentToEdit) {
        const result = await patchCommentAction(commentToEdit.id, {
          content: data.content || "",
          replyId: data.replyId ?? commentToEdit.replyId ?? null,
          images,
        });
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data;
      } else {
        const replyTarget =
          data.replyId ??
          (isReply && targetComment
            ? (targetComment.replyId ?? targetComment.id)
            : null);
        const result = await addCommentAction(
          {
            content: data.content || "",
            replyId: replyTarget,
            images,
          },
          postId,
        );
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });

      const replyKey =
        (isEdit && commentToEdit?.replyId) ||
        (isReply && targetComment
          ? (targetComment.replyId ?? targetComment.id)
          : undefined);
      if (replyKey) {
        queryClient.invalidateQueries({ queryKey: ["replies", replyKey] });
      }

      toast.success(
        isEdit
          ? "Comment updated"
          : isReply
            ? "Reply posted"
            : "Comment posted",
      );

      reset();
      setSelectedFile(null);
      if (previewUrl && !isEdit) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(isEdit ? commentToEdit?.images[0]?.url || null : null);
      onSuccess?.();
      if (isEdit && onCancel) onCancel();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const hasImage =
    !!selectedFile ||
    (isEdit && !!commentToEdit && commentToEdit.images.length > 0);

  const onSubmit: SubmitHandler<AddCommentType> = async (data) => {
    const hasText = !!data.content && data.content.trim().length > 0;
    if (!hasText && !hasImage) {
      toast.error("Please add content or attach an image.");
      return;
    }

    try {
      await mutation.mutateAsync(data);
    } catch (error) {
      console.error("Failed to submit comment:", error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    if (previewUrl && !isEdit) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };

  const safeContent = content ?? "";
  const isDisabled = mutation.isPending || (!safeContent.trim() && !hasImage);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (
      (mode === "reply" || mode === "edit" || autoFocus) &&
      textareaRef.current
    ) {
      textareaRef.current.focus();
    }
  }, [mode, targetComment, commentToEdit, autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !mutation.isPending) {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
  };

  const contentRegister = register("content");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full z-10 space-y-2">
      {previewUrl && (
        <div className="relative w-20 h-20">
          <Image
            src={previewUrl}
            alt="Preview"
            fill
            className="rounded-lg object-cover cursor-pointer duration-300 ease-out hover:brightness-90 hover:contrast-105 transition-all"
            onClick={() => onViewImage?.(previewUrl)}
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-1 right-1 bg-gray-300 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-black rounded-full p-1 transition"
          >
            <X size={10} />
          </button>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <label className="p-2 bg-white dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded cursor-pointer transition text-lg">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={mutation.isPending || selectedFile !== null}
            className="hidden"
          />
          <Camera />
        </label>

        <div className="flex-1 flex items-center space-y-1">
          <textarea
            placeholder={
              isEdit
                ? "Edit your comment..."
                : isReply
                  ? "Write a reply..."
                  : "Write a comment..."
            }
            maxLength={500}
            className="w-full text-base p-2 rounded-md bg-white dark:bg-black text-black dark:text-white resize-none h-10 outline-none border border-gray-300 dark:border-neutral-700 focus:border-black dark:focus:border-neutral-500 scrollbar-none"
            {...contentRegister}
            ref={(el) => {
              contentRegister.ref(el);
              textareaRef.current = el;
            }}
            onKeyDown={handleKeyDown}
            disabled={mutation.isPending}
          />
          {safeContent.length > 450 && (
            <div className="text-xs text-gray-400">
              {safeContent.length}/500
            </div>
          )}
        </div>

        {mutation.isPending ? (
          <span className="w-8 h-8 rounded-full border-2 border-black/30 border-t-black dark:border-white/30 dark:border-t-white cursor-progress animate-spin" />
        ) : (
          <button
            type="submit"
            disabled={isDisabled}
            className={`px-3 py-2 h-10 rounded bg-blue-400 text-white dark:bg-white dark:text-black flex items-center justify-center ${isDisabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-blue-500 dark:hover:bg-neutral-300 active:scale-90 transition-all"
              }`}
          >
            <SendHorizonal size={18} />
          </button>
        )}
      </div>
    </form>
  );
};
