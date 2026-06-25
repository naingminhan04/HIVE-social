"use client";

import {
  FileIcon,
  ImageIcon,
  LoaderIcon,
  Paperclip,
  PenBox,
  Play,
  Plus,
  Video,
  X,
} from "lucide-react";
import Image from "next/image";
import { useForm, SubmitHandler } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ReactNode, useCallback, useState } from "react";
import { addPostAction } from "@/app/_actions/postAction";
import { AddPostType, ImageType } from "@/types/post";
import { uploadFiles } from "@/utils/uploadUtils";
import { captureVideoThumbnail } from "@/utils/videoThumbnail";
import { GlobalSettings } from "@/utils/global-settings";
import toast from "react-hot-toast";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { useAuthStore } from "@/store/auth";
import OverlayPortal from "../layout/OverlayPortal";
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

export default function AddPostBtn({
  state,
}: {
  state: "nav" | "sidebar" | "reel";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [videoPosterUrls, setVideoPosterUrls] = useState<string[]>([]);
  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch } = useForm<FormValues>();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const username = user?.username?.trim();
  useLockBodyScroll(isOpen);

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      return await uploadFiles(files);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const postMutation = useMutation({
    mutationFn: async (postData: AddPostType) => {
      const result = await addPostAction(postData);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      if (username) {
        await queryClient.invalidateQueries({ queryKey: ["user", username] });
      }
      handleClose();
    },
    onError: (error: Error) =>
      toast.error(`Failed to create post: ${error.message}`),
  });

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSelectedFiles([]);
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    setSelectedAttachments([]);
    reset();
  }, [previewUrls, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (selectedFiles.length === 0 && selectedAttachments.length === 0 && !data.content.trim()) {
      toast.error("Please add content, photos, videos, or attachments.");
      return;
    }

    setIsOpen(false);
    const toastId = toast.loading("Uploading post in progress");

    try {
      let imagesForPost: ImageType[] = [];
      let attachmentsForPost: ImageType[] = [];

      // Upload photos and videos first.
      if (selectedFiles.length > 0) {
        try {
          const uploadedImages = await uploadMutation.mutateAsync(selectedFiles);
          imagesForPost = uploadedImages.map((img) => ({
            key: img.key,
            fileName: img.fileName,
            fileSize: img.fileSize,
            mimeType: img.mimeType,
          }));
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : "Failed to upload media");
        }
      }

      // Upload attachments
      if (selectedAttachments.length > 0) {
        try {
          const uploadedAttachments = await uploadMutation.mutateAsync(selectedAttachments);
          attachmentsForPost = uploadedAttachments.map((att) => ({
            key: att.key,
            fileName: att.fileName,
            fileSize: att.fileSize,
            mimeType: att.mimeType,
          }));
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
      toast.success("Post uploaded successfully", { id: toastId });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to create post";
      toast.error(errorMsg, { id: toastId });
    }
  };

  const handleMediaChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const filesArray = Array.from(e.target.files || []);
      const totalFiles = selectedFiles.length + filesArray.length;
      if (totalFiles > MAX_MEDIA) {
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

      const startIndex = selectedFiles.length;
      setSelectedFiles((prev) => [...prev, ...filesArray]);
      const newPreviewUrls = filesArray.map((file) => URL.createObjectURL(file));
      setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
      setVideoPosterUrls((prev) => [...prev, ...filesArray.map(() => "")]);

      void (async () => {
        const posters = await Promise.all(
          filesArray.map(async (file) =>
            isVideoFile(file) ? captureVideoThumbnail(file).catch(() => "") : "",
          ),
        );
        setVideoPosterUrls((prev) => {
          const next = [...prev];
          posters.forEach((poster, offset) => {
            if (poster) next[startIndex + offset] = poster;
          });
          return next;
        });
      })();

      e.target.value = "";
    },
    [selectedFiles.length]
  );

  const handleAttachmentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const filesArray = Array.from(e.target.files || []);
      const totalAttachments = selectedAttachments.length + filesArray.length;
      if (totalAttachments > MAX_ATTACHMENTS) {
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
    [selectedAttachments.length]
  );

  const removeFile = useCallback(
    (index: number) => {
      setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
      setPreviewUrls((prev) => {
        URL.revokeObjectURL(prev[index]);
        return prev.filter((_, i) => i !== index);
      });
      setVideoPosterUrls((prev) => prev.filter((_, i) => i !== index));
    },
    []
  );

  const removeAttachment = useCallback(
    (index: number) => {
      setSelectedAttachments((prev) => prev.filter((_, i) => i !== index));
    },
    []
  );

  const isLoading = uploadMutation.isPending || postMutation.isPending;
  const contentValue = watch("content") || "";
  const isPostDisabled =
    isLoading || (selectedFiles.length === 0 && selectedAttachments.length === 0 && contentValue.trim() === "");
  const photoItems = selectedFiles
    .map((file, index) => ({ file, index }))
    .filter(({ file }) => isImageFile(file));
  const videoItems = selectedFiles
    .map((file, index) => ({ file, index }))
    .filter(({ file }) => isVideoFile(file));
  const mediaForViewer = selectedFiles.map((file, index) => ({
    id: `new-${index}-${file.name}`,
    url: previewUrls[index],
    mimeType: file.type,
    fileName: file.name,
  }));

  return (
    <>
      <button
        onClick={() => {
          if (!isLoading) setIsOpen(true);
        }}
        hidden={isOpen}
        className={`${state != "reel"
            ? "rounded-md hidden md:block p-2 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600"
            : "fixed bottom-10 right-10 rounded-full md:hidden w-14 h-14 bg-gray-300 dark:bg-neutral-700 hover:bg-gray-400 dark:hover:bg-black"
          }   active:scale-90 flex justify-center items-center z-50 transition-all`}
        aria-label="Add post"
        disabled={isLoading}
      >
        {isLoading ? (
          <LoaderIcon className="animate-spin" size={24} />
        ) : state != "reel" ? (
          <div className="flex items-center justify-center gap-1">
            <PenBox size={24} />
          </div>
        ) : (
          <Plus size={24} />
        )}
      </button>

      {isOpen && (
        <OverlayPortal>
          <div className="fixed inset-0 z-[120] bg-neutral-50 dark:bg-neutral-950 flex justify-center items-start p-4 overflow-auto">
            <div className="w-full max-w-2xl my-auto">
              <form
                className="w-full flex flex-col gap-4"
                onSubmit={handleSubmit(onSubmit)}
              >
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 rounded-xl bg-neutral-950 dark:bg-gray-300 hover:bg-neutral-700 dark:hover:bg-gray-400 active:scale-95 w-20 h-10 flex justify-center items-center text-white dark:text-black font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPostDisabled}
                    className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 active:scale-95 w-20 h-10 flex justify-center items-center text-white font-bold disabled:opacity-50 transition-all"
                  >
                    {isLoading ? (
                      <span className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      "Post"
                    )}
                  </button>
                </div>
                <div className="pointer-events-auto flex items-center gap-3 my-1">
                  <Image
                    src={user?.profilePic || "/default-avatar.png"}
                    alt={user?.name as string}
                    width={100}
                    height={100}
                    className="w-12 h-12 bg-gray-300 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-semibold flex gap-1 text-black dark:text-white">
                      {user?.name}
                      {user?.id === userId && (
                        <span className="text-blue-600 dark:text-blue-500 font-semibold">(You)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Post cost: {GlobalSettings.postCreationCost} points
                    </p>
                  </div>
                </div>

                <div className="relative h-50 ">
                  <textarea
                    placeholder="What's on your mind?"
                    maxLength={500}
                    className="w-full p-4 rounded-md scrollbar-none resize-none h-full outline-0 border bg-white dark:bg-black border-gray-400 dark:border-neutral-600 focus:border-black dark:focus:border-white focus:border-2 transition-all"
                    {...register("content")}
                    disabled={isLoading}
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
                    count={photoItems.length}
                    max={MAX_MEDIA}
                    accept="image/*"
                    disabled={isLoading || selectedFiles.length >= MAX_MEDIA}
                    onChange={handleMediaChange}
                  />
                  <MediaDropzone
                    icon={<Video size={22} />}
                    title="Videos"
                    count={videoItems.length}
                    max={MAX_MEDIA}
                    accept="video/*"
                    disabled={isLoading || selectedFiles.length >= MAX_MEDIA}
                    onChange={handleMediaChange}
                  />
                  <MediaDropzone
                    icon={<Paperclip size={22} />}
                    title="Attachments"
                    count={selectedAttachments.length}
                    max={MAX_ATTACHMENTS}
                    disabled={isLoading || selectedAttachments.length >= MAX_ATTACHMENTS}
                    onChange={handleAttachmentChange}
                  />
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Media ({selectedFiles.length}/{MAX_MEDIA})
                    </h3>
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="relative w-full cursor-pointer overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800"
                          onClick={() => {
                            setViewerIndex(index);
                            setViewerOpen(true);
                          }}
                        >
                          <div className="relative aspect-square w-full">
                            {isVideoFile(file) ? (
                              <>
                                {videoPosterUrls[index] ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={videoPosterUrls[index]}
                                    alt={file.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <video
                                    src={previewUrls[index]}
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
                            ) : (
                              <Image
                                src={previewUrls[index]}
                                alt={`Preview ${index + 1}`}
                                fill
                                sizes="(min-width: 768px) 10rem, 33vw"
                                className="object-cover"
                              />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-red-600 active:scale-95 disabled:opacity-50"
                            disabled={isLoading}
                            aria-label={`Remove media ${index + 1}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAttachments.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-neutral-700 pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Attachments ({selectedAttachments.length}/{MAX_ATTACHMENTS})</h3>
                    <div className="space-y-2">
                      {selectedAttachments.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-neutral-800 rounded-lg"
                        >
                          <FileIcon size={18} className="text-gray-500 dark:text-gray-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
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
                      : "Creating post..."}
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
      )}
    </>
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
