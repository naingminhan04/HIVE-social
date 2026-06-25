"use client";

import {
  FileIcon,
  ImageIcon,
  Paperclip,
  Play,
  Video,
  X,
} from "lucide-react";
import Image from "next/image";
import { useForm, SubmitHandler } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ReactNode, useCallback, useState } from "react";
import { patchPostAction } from "@/app/_actions/postAction";
import {
  AddPostType,
  ImageType,
  PostType,
  PostImageType,
} from "@/types/post";
import { uploadFiles } from "@/utils/uploadUtils";
import toast from "react-hot-toast";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { formatDate } from "@/utils/formatDate";
import { useAuthStore } from "@/store/auth";
import OverlayPortal from "../layout/OverlayPortal";
import { getVideoPosterUrl, isVideoMedia } from "@/utils/media";
import ImageViewer from "../common/ImageViewer";
import RichTextContent from "../common/RichTextContent";

type FormValues = {
  content: string;
};

const MAX_MEDIA = 20;
const MAX_ATTACHMENTS = 10;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const isVideoFile = (file: File) => file.type.startsWith("video/");
const isImageFile = (file: File) => file.type.startsWith("image/");

export default function EditPostForm({
  post,
  onClose,
}: {
  post: PostType;
  onClose: () => void;
}) {
  const getSrc = (img: PostImageType) => img.url || img.thumbnailUrl || "";
  const relativeTime = formatDate(post.createdAt);
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const username = user?.username?.trim();
  useLockBodyScroll(true);

  const [existingImages, setExistingImages] = useState<PostImageType[]>(
    post.images ?? []
  );

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [existingAttachments, setExistingAttachments] = useState<PostImageType[]>(
    post.attachments ?? []
  );
  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, watch } = useForm<FormValues>({
    defaultValues: {
      content: post.content ?? "",
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      return uploadFiles(files);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const postMutation = useMutation({
    mutationFn: async (postData: AddPostType) => {
      const result = await patchPostAction(post.id, postData);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      await queryClient.invalidateQueries({ queryKey: ["post", post.id] });
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      if (username) {
        await queryClient.invalidateQueries({ queryKey: ["user", username] });
      }
      setSelectedFiles([]);
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      reset();
    },

    onError: () => toast.error(`Failed to update post`),
  });

  const isLoading = uploadMutation.isPending || postMutation.isPending;

  const handleClose = useCallback(() => {
    if (isLoading) return;

    setSelectedFiles([]);
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    reset();
    onClose();
  }, [previewUrls, reset, isLoading, onClose]);

  const handleUserClose = useCallback(() => {
    if (isLoading) return;
    handleClose();
  }, [isLoading, handleClose]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (
      existingImages.length === 0 &&
      selectedFiles.length === 0 &&
      existingAttachments.length === 0 &&
      selectedAttachments.length === 0 &&
      !data.content.trim()
    ) {
      toast.error("Please add content, photos, videos, or attachments.");
      return;
    }

    const toastId = toast.loading("Editing post...");

    onClose();
    if (isLoading) return;

    try {
      let imagesForPost: ImageType[] = existingImages.map((img) => ({
        key: img.key,
        fileName: img.fileName,
        fileSize: img.fileSize,
        mimeType: img.mimeType,
      }));

      if (selectedFiles.length > 0) {
        try {
          const uploaded = await uploadMutation.mutateAsync(selectedFiles);

          const newImages: ImageType[] = uploaded.map((img) => ({
            key: img.key,
            fileName: img.fileName,
            fileSize: img.fileSize,
            mimeType: img.mimeType,
          }));

          const keyOf = (i: { key?: string }) => i.key || "";
          const existingKeys = new Set(imagesForPost.map(keyOf));
          imagesForPost = imagesForPost.concat(
            newImages.filter((n) => !existingKeys.has(keyOf(n)))
          );
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : "Failed to upload media");
        }
      }

      let attachmentsForPost: ImageType[] = existingAttachments.map((att) => ({
        key: att.key,
        fileName: att.fileName,
        fileSize: att.fileSize,
        mimeType: att.mimeType,
      }));

      if (selectedAttachments.length > 0) {
        try {
          const uploaded = await uploadMutation.mutateAsync(selectedAttachments);

          const newAttachments: ImageType[] = uploaded.map((att) => ({
            key: att.key,
            fileName: att.fileName,
            fileSize: att.fileSize,
            mimeType: att.mimeType,
          }));

          const keyOf = (a: { key?: string }) => a.key || "";
          const existingKeys = new Set(attachmentsForPost.map(keyOf));
          attachmentsForPost = attachmentsForPost.concat(
            newAttachments.filter((n) => !existingKeys.has(keyOf(n)))
          );
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : "Failed to upload attachments");
        }
      }

      await postMutation.mutateAsync({
        content: data.content || null,
        sharedPostId: null,
        images: imagesForPost,
        attachments: attachmentsForPost,
      });
      toast.success("Post updated successfully!", { id: toastId });
    } catch {
      toast.error(`Unexpected error while editing post`, { id: toastId });
    }
  };

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isLoading) return;

      const filesArray = Array.from(e.target.files || []);
      const total =
        existingImages.length + selectedFiles.length + filesArray.length;

      if (total > MAX_MEDIA) {
        toast.error(`You can upload up to ${MAX_MEDIA} photos and videos.`);
        e.target.value = "";
        return;
      }
      const oversizedFile = filesArray.find(
        (file) => file.size > MAX_FILE_SIZE_BYTES,
      );
      if (oversizedFile) {
        toast.error("Maximum file size is 50MB.");
        e.target.value = "";
        return;
      }

      setSelectedFiles((prev) => [...prev, ...filesArray]);
      setPreviewUrls((prev) => [
        ...prev,
        ...filesArray.map((file) => URL.createObjectURL(file)),
      ]);
      e.target.value = "";
    },
    [existingImages.length, selectedFiles.length, isLoading]
  );

  const handleAttachmentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isLoading) return;

      const filesArray = Array.from(e.target.files || []);
      const total =
        existingAttachments.length + selectedAttachments.length + filesArray.length;

      if (total > MAX_ATTACHMENTS) {
        toast.error(`You can upload up to ${MAX_ATTACHMENTS} attachments.`);
        e.target.value = "";
        return;
      }

      const oversizedAttachment = filesArray.find(
        (file) => file.size > MAX_FILE_SIZE_BYTES,
      );
      if (oversizedAttachment) {
        toast.error("Maximum file size is 50MB.");
        e.target.value = "";
        return;
      }

      setSelectedAttachments((prev) => [...prev, ...filesArray]);
      e.target.value = "";
    },
    [existingAttachments.length, selectedAttachments.length, isLoading]
  );

  const removeNewFile = useCallback(
    (index: number) => {
      if (isLoading) return;

      setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
      setPreviewUrls((prev) => {
        URL.revokeObjectURL(prev[index]);
        return prev.filter((_, i) => i !== index);
      });
    },
    [isLoading]
  );

  const removeExistingImage = useCallback(
    (index: number) => {
      if (isLoading) return;
      setExistingImages((prev) => prev.filter((_, i) => i !== index));
    },
    [isLoading]
  );

  const removeExistingAttachment = useCallback(
    (index: number) => {
      if (isLoading) return;
      setExistingAttachments((prev) => prev.filter((_, i) => i !== index));
    },
    [isLoading]
  );

  const removeNewAttachment = useCallback(
    (index: number) => {
      if (isLoading) return;
      setSelectedAttachments((prev) => prev.filter((_, i) => i !== index));
    },
    [isLoading]
  );

  const allImagesCount = existingImages.length + selectedFiles.length;
  const allAttachmentsCount = existingAttachments.length + selectedAttachments.length;
  const photoCount =
    existingImages.filter((media) => !isVideoMedia(media)).length +
    selectedFiles.filter(isImageFile).length;
  const videoCount =
    existingImages.filter(isVideoMedia).length +
    selectedFiles.filter(isVideoFile).length;
  const contentValue = watch("content") || "";
  const mediaForViewer = [
    ...existingImages.map((img, index) => ({
      id: img.id || `existing-${index}`,
      url: getSrc(img),
      mimeType: img.mimeType || undefined,
      fileName: img.fileName || undefined,
    })),
    ...selectedFiles.map((file, index) => ({
      id: `new-${index}-${file.name}`,
      url: previewUrls[index],
      mimeType: file.type,
      fileName: file.name,
    })),
  ].filter((item) => !!item.url);

  const isPostDisabled =
    isLoading || (allImagesCount === 0 && allAttachmentsCount === 0 && contentValue.trim() === "");

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[120] bg-neutral-50 dark:bg-neutral-950 flex justify-center items-start p-4 overflow-auto scrollbar-none">
        <div className="w-full max-w-2xl my-auto">
          <form
            className="w-full flex flex-col gap-4"
            onSubmit={handleSubmit(onSubmit)}
          >
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={handleUserClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-neutral-950 dark:bg-gray-300 hover:bg-neutral-700 dark:hover:bg-gray-400 active:scale-95 transition-all w-20 h-10 flex justify-center items-center text-white dark:text-black font-bold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPostDisabled}
                className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 active:scale-95 transition-all w-20 h-10 flex justify-center items-center text-white font-bold disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  "Edit"
                )}
              </button>
            </div>
            <div className="pointer-events-auto flex items-center gap-3 my-1">
              <Image
                src={post.author.profilePic || "/default-avatar.png"}
                alt={post.author.name}
                width={100}
                height={100}
                className="w-12 h-12 rounded-full bg-gray-300 object-cover"
              />
              <div>
                <p className="font-semibold flex gap-1 text-black dark:text-white">
                  {post.author.name}
                  {post.author.id === userId && (
                    <span className="text-blue-600 dark:text-blue-500 font-semibold">(You)</span>
                  )}
                </p>
                <p className="text-xs flex gap-1 text-gray-500 dark:text-gray-400 self-center">
                  {relativeTime}
                  {post.isEdited && <span>[Edited]</span>}
                </p>
              </div>
            </div>

            <div className="relative h-50">
              <textarea
                {...register("content")}
                placeholder="What's on your mind?"
                maxLength={500}
                disabled={isLoading}
                className="w-full p-4 scrollbar-none rounded-md bg-white dark:bg-black text-black dark:text-white resize-none h-full outline-0 border border-gray-400 dark:border-neutral-600 focus:border-black dark:focus:border-white focus:border-2"
              />
              <div className="absolute bottom-4 right-2 text-xs">
                {contentValue.length}/500
              </div>
            </div>
            {contentValue.trim().length > 0 && (
              <div className="rounded-md border border-gray-300 bg-white p-3 text-sm text-black dark:border-neutral-700 dark:bg-black dark:text-white">
                <p className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Preview
                </p>
                <RichTextContent text={contentValue} />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <MediaDropzone
                icon={<ImageIcon size={22} />}
                title="Photos"
                count={photoCount}
                max={MAX_MEDIA}
                accept="image/*"
                disabled={isLoading || allImagesCount >= MAX_MEDIA}
                onChange={handleFileChange}
              />
              <MediaDropzone
                icon={<Video size={22} />}
                title="Videos"
                count={videoCount}
                max={MAX_MEDIA}
                accept="video/*"
                disabled={isLoading || allImagesCount >= MAX_MEDIA}
                onChange={handleFileChange}
              />
              <MediaDropzone
                icon={<Paperclip size={22} />}
                title="Attachments"
                count={allAttachmentsCount}
                max={MAX_ATTACHMENTS}
                disabled={isLoading || allAttachmentsCount >= MAX_ATTACHMENTS}
                onChange={handleAttachmentChange}
              />
            </div>

            {allImagesCount > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Media ({allImagesCount}/{MAX_MEDIA})
                </h3>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {existingImages.map((img, index) => {
                    const src = getSrc(img);
                    const isVideo = isVideoMedia(img);
                    const posterUrl = getVideoPosterUrl(img);
                    return (
                      <div
                        key={img.id || index}
                        className="relative w-full cursor-pointer overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800"
                        onClick={() => {
                          setViewerIndex(index);
                          setViewerOpen(true);
                        }}
                      >
                        <div className="relative aspect-square w-full">
                          {src && isVideo ? (
                            <>
                              {posterUrl ? (
                                <Image
                                  src={posterUrl}
                                  alt="Video thumbnail"
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <video
                                  src={`${src}#t=0.01`}
                                  className="h-full w-full object-cover"
                                  preload="metadata"
                                  muted
                                  playsInline
                                />
                              )}
                              <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                                <Play size={24} fill="currentColor" />
                              </span>
                            </>
                          ) : src ? (
                            <Image
                              src={src}
                              alt="Existing image"
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-neutral-800" />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExistingImage(index)}
                          disabled={isLoading}
                          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-red-600 active:scale-95 disabled:opacity-50"
                          aria-label={`Remove media ${index + 1}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}

                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="relative w-full cursor-pointer overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800"
                      onClick={() => {
                        setViewerIndex(existingImages.length + index);
                        setViewerOpen(true);
                      }}
                    >
                      <div className="relative aspect-square w-full">
                        {isVideoFile(file) ? (
                          <>
                            <video
                              src={previewUrls[index]}
                              className="h-full w-full object-cover"
                              preload="metadata"
                              muted
                              playsInline
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                              <Play size={24} fill="currentColor" />
                            </span>
                          </>
                        ) : (
                          <Image
                            src={previewUrls[index]}
                            alt="Preview"
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeNewFile(index)}
                        disabled={isLoading}
                        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-red-600 active:scale-95 disabled:opacity-50"
                        aria-label={`Remove media ${index + 1}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allAttachmentsCount > 0 && (
              <div className="border-t border-gray-200 dark:border-neutral-700 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Attachments ({allAttachmentsCount}/{MAX_ATTACHMENTS})</h3>
                <div className="space-y-2">
                  {existingAttachments.map((att, index) => {
                    const src = getSrc(att);
                    return (
                      <div
                        key={att.id || index}
                        className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-neutral-800 rounded-lg group"
                      >
                        <FileIcon size={18} className="text-gray-500 dark:text-gray-400 shrink-0" />
                        <a
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-0 hover:underline"
                        >
                          <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{att.fileName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{(att.fileSize / 1024).toFixed(1)} KB</p>
                        </a>
                        <button
                          type="button"
                          onClick={() => removeExistingAttachment(index)}
                          className="p-1 hover:bg-red-200 dark:hover:bg-red-900 rounded text-red-500 hover:text-red-600 transition-all"
                          disabled={isLoading}
                          aria-label={`Remove attachment ${index + 1}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                  {selectedAttachments.map((file, index) => (
                    <div
                      key={`new-${file.name}-${index}`}
                      className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-neutral-800 rounded-lg"
                    >
                      <FileIcon size={18} className="text-gray-500 dark:text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeNewAttachment(index)}
                        className="p-1 hover:bg-red-200 dark:hover:bg-red-900 rounded text-red-500 hover:text-red-600 transition-all"
                        disabled={isLoading}
                        aria-label={`Remove attachment ${index + 1}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="text-center text-neutral-400 text-sm">
                {uploadMutation.isPending
                  ? "Uploading files..."
                  : "Updating post..."}
              </div>
            )}
          </form>
        </div>
      </div>
      {viewerOpen && mediaForViewer.length > 0 && (
        <ImageViewer
          images={mediaForViewer}
          index={viewerIndex}
          onClose={() => setViewerOpen(false)}
          onChange={setViewerIndex}
          showPaginationOnVideo
        />
      )}
    </OverlayPortal>
  );
}

function MediaDropzone({
  icon,
  title,
  count,
  max,
  accept,
  disabled,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  max: number;
  accept?: string;
  disabled: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label
      className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-white p-4 text-center transition hover:border-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-400 dark:hover:bg-neutral-800 ${disabled ? "pointer-events-none opacity-50" : ""
        }`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
        {icon}
      </span>
      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        {title}
      </span>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">
        {count}/{max}
      </span>
      <input
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={onChange}
        disabled={disabled}
      />
    </label>
  );
}
