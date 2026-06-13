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

/**
 * Upload files via server action (avoids browser CORS on production).
 * Used by AddPostForm, EditPostForm, Chat, Comments, and Profile.
 */
export async function uploadFiles(files: File[]): Promise<UploadedFile[]> {
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
