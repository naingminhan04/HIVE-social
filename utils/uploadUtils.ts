import { uploadFileAction } from "@/app/_actions/upload";

/**
 * Generic file response from upload API
 */
export interface UploadedFile {
  key: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export const MAX_UPLOAD_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Upload files via server action (avoids browser CORS on production).
 * Used by AddPostForm, EditPostForm, Chat, Comments, and Profile.
 */
export async function uploadFiles(files: File[]): Promise<UploadedFile[]> {
  const oversizedFile = files.find((file) => file.size > MAX_UPLOAD_FILE_SIZE_BYTES);
  if (oversizedFile) {
    throw new Error("Maximum file size is 50MB.");
  }

  const results: UploadedFile[] = [];

  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadFileAction(formData);
    if (!result.success) {
      throw new Error(result.error);
    }

    results.push(result.data);
  }

  return results;
}
