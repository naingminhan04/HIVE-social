"use client";

import { Plus, X, LoaderIcon, PenBox, FileIcon } from "lucide-react";
import Image from "next/image";
import { useForm, SubmitHandler } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { addPostAction } from "../_actions/postAction";
import { AddPostType, ImageType } from "@/types/post";
import { uploadFiles } from "@/utils/uploadUtils";
import toast from "react-hot-toast";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { useAuthStore } from "@/store/auth";
import OverlayPortal from "./OverlayPortal";

type FormValues = {
  content: string;
};

const MAX_IMAGES = 20;
const MAX_ATTACHMENTS = 10;

export default function AddPostBtn({
  state,
}: {
  state: "nav" | "sidebar" | "reel";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);
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
      toast.error("Please add content, images, or attachments.");
      return;
    }

    setIsOpen(false);
    const toastId = toast.loading("Uploading post in progress");

    try {
      let imagesForPost: ImageType[] = [];
      let attachmentsForPost: ImageType[] = [];
      
      // Upload images first
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
          throw new Error(error instanceof Error ? error.message : "Failed to upload images");
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

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const filesArray = Array.from(e.target.files || []);
      const totalFiles = selectedFiles.length + filesArray.length;
      if (totalFiles > MAX_IMAGES) {
        toast.error(`You can upload up to ${MAX_IMAGES} images.`);
        return;
      }

      setSelectedFiles((prev) => [...prev, ...filesArray]);
      const newPreviewUrls = filesArray.map((file) =>
        URL.createObjectURL(file)
      );
      setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
    },
    [selectedFiles.length]
  );

  const handleAttachmentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const filesArray = Array.from(e.target.files || []);
      const totalAttachments = selectedAttachments.length + filesArray.length;
      if (totalAttachments > MAX_ATTACHMENTS) {
        toast.error(`You can upload up to ${MAX_ATTACHMENTS} attachments.`);
        return;
      }

      setSelectedAttachments((prev) => [...prev, ...filesArray]);
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

  return (
    <>
      <button
        onClick={() => {
          if (!isLoading) setIsOpen(true);
        }}
        hidden={isOpen}
        className={`${
          state != "reel"
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
                <div>
                  <p className="font-semibold flex gap-1 text-black dark:text-white">
                    {user?.name}
                    {user?.id === userId && (
                      <span className="text-blue-600 dark:text-blue-500 font-semibold">(You)</span>
                    )}
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

              {selectedFiles.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="relative group w-full"
                    >
                      <div className="relative w-full aspect-square">
                        <Image
                          src={previewUrls[index]}
                          alt={`Preview ${index + 1}`}
                          fill
                          className="object-cover rounded-lg"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 active:scale-85 rounded-full text-white w-6 h-6 flex items-center justify-center opacity-100 transition-all disabled:opacity-50"
                        disabled={isLoading}
                        aria-label={`Remove image ${index + 1}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  {selectedFiles.length < MAX_IMAGES && (
                    <label
                      className={`w-full aspect-square border-2 border-dashed border-neutral-400 hover:border-neutral-800 active:border-neutral-400 dark:border-neutral-600 dark:hover:border-neutral-400 dark:active:border-neutral-600 flex justify-center items-center cursor-pointer rounded-lg transition-colors ${
                        isLoading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <Plus size={24} className="text-neutral-400" />
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={isLoading}
                      />
                    </label>
                  )}
                </div>
              ) : (
                <label
                  className={`w-full border-2 border-dashed border-neutral-400 hover:border-neutral-800 active:border-neutral-400 dark:border-neutral-600 dark:hover:border-neutral-400 dark:active:border-neutral-600 rounded-lg p-8 flex flex-col justify-center items-center cursor-pointer transition-colors ${
                    isLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <Plus size={32} className="text-neutral-400 mb-2" />
                  <span className="text-neutral-400 text-sm">
                    Add images ({MAX_IMAGES} max)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isLoading}
                  />
                </label>
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

              {selectedAttachments.length < MAX_ATTACHMENTS && (
                <label className={`w-full border-2 border-dashed border-neutral-400 hover:border-neutral-800 active:border-neutral-400 dark:border-neutral-600 dark:hover:border-neutral-400 dark:active:border-neutral-600 rounded-lg p-4 flex flex-col justify-center items-center cursor-pointer transition-colors ${
                  isLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}>
                  <div className="flex items-center gap-2 text-neutral-400">
                    <FileIcon size={20} />
                    <span className="text-sm">Add attachments ({selectedAttachments.length}/{MAX_ATTACHMENTS} max)</span>
                  </div>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleAttachmentChange}
                    disabled={isLoading}
                  />
                </label>
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
        </OverlayPortal>
      )}
    </>
  );
}
