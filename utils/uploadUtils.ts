"use client";

import api from "@/libs/axios";// adjust path if needed

/**
 * Generic file response from upload API
 */
export interface UploadedFile {
  key: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Upload files to backend API (S3 handled by backend)
 * Used by AddPostForm, EditPostForm, and Profile components
 */
export async function uploadFiles(files: File[]): Promise<UploadedFile[]> {
  try {
    const results: UploadedFile[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post<UploadedFile>(
        "/upload/upload",
        formData
      );

      results.push(response.data);
    }

    return results;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "File upload failed";

    throw new Error(message);
  }
}