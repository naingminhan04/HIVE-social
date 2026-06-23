"use server";

import api from "@/libs/axios";
import type { ActionResponse } from "@/types/action";
import type {
  ActiveThoughtResponse,
  CreateThoughtResponse,
  DeleteThoughtResponse,
} from "@/types/thought";
import { APIError } from "@/types/error";
import axios from "axios";

const getThoughtError = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as APIError | undefined;
    return data?.message || data?.error || fallback;
  }
  return fallback;
};

export async function createThoughtAction(
  text: string,
): Promise<ActionResponse<CreateThoughtResponse>> {
  try {
    const res = await api.post<CreateThoughtResponse>("/thoughts", { text });
    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getThoughtError(error, "Failed to share thought"),
    };
  }
}

export async function getActiveThoughtByUserAction(
  userId: string,
): Promise<ActionResponse<ActiveThoughtResponse>> {
  try {
    const res = await api.get<ActiveThoughtResponse>(
      `/thoughts/users/${userId}/active`,
    );
    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getThoughtError(error, "Failed to load thought"),
    };
  }
}

export async function deleteThoughtAction(
  thoughtId: string,
): Promise<ActionResponse<DeleteThoughtResponse>> {
  try {
    const res = await api.delete<DeleteThoughtResponse>(`/thoughts/${thoughtId}`);
    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getThoughtError(error, "Failed to delete thought"),
    };
  }
}
