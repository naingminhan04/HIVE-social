"use server";

import api from "@/libs/axios";
import type { ActionResponse } from "@/types/action";
import { APIError } from "@/types/error";
import type {
  CreateProfileViewResponse,
  ProfileViewsResponse,
} from "@/types/profile-view";
import axios from "axios";

const getProfileViewError = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as APIError | undefined;
    return data?.message || data?.error || fallback;
  }
  return fallback;
};

export async function createProfileViewAction(
  profileUserId: string,
): Promise<ActionResponse<CreateProfileViewResponse>> {
  try {
    const res = await api.post<CreateProfileViewResponse>("/views/profile", {
      profileUserId,
    });
    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getProfileViewError(error, "Failed to create profile view"),
    };
  }
}

export async function getProfileViewsAction({
  page = 1,
  size = 20,
}: {
  page?: number;
  size?: number;
} = {}): Promise<ActionResponse<ProfileViewsResponse>> {
  try {
    const res = await api.get<ProfileViewsResponse>("/views/profile", {
      params: { page, size },
    });
    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getProfileViewError(error, "Failed to load profile views"),
    };
  }
}
