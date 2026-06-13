"use server";

import api from "@/libs/axios";
import { ActionResponse } from "@/types/action";
import { getApiErrorMessage } from "@/utils/apiError";
import type { UploadedFile } from "@/utils/uploadUtils";

export async function uploadFileAction(
  formData: FormData,
): Promise<ActionResponse<UploadedFile>> {
  try {
    const file = formData.get("file");

    if (!(file instanceof Blob)) {
      return { success: false, error: "No file provided" };
    }

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    const res = await api.post<UploadedFile>("/upload/upload", uploadFormData);
    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "File upload failed"),
    };
  }
}
