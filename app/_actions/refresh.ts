"use server";

import { ActionResponse } from "@/types/action";
import { LoginSuccessResponse } from "@/types/auth";
import {
  getRefreshToken,
  setAccessCookies,
  setRefreshCookie,
  setUserApprovalCookie,
} from "./cookies";
import axios from "axios";
import { API_BASE_URL } from "@/libs/apiBase";
import { getApiErrorMessage } from "@/utils/apiError";
import { normalizeUserPayload } from "@/utils/normalizeUser";

export async function refreshAction(): Promise<ActionResponse<LoginSuccessResponse>> {
  try {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      return {
        success: false,
        error: "Session refresh failed. Please sign in again.",
      };
    }

    const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
      refreshToken,
    });
    const payload = data?.data ?? data;

    const accessToken = payload?.accessToken ?? payload?.access_token;
    const nextRefreshToken = payload?.refreshToken ?? payload?.refresh_token;

    if (accessToken) {
      await setAccessCookies(accessToken);
      if (nextRefreshToken) await setRefreshCookie(nextRefreshToken);
    }

    const user = normalizeUserPayload(payload?.user ?? payload);

    if (!user) {
      return {
        success: false,
        error: "Session refresh failed: No user received.",
      };
    }

    await setUserApprovalCookie(user.isVerified);

    return {
      success: true,
      data: {
        accessToken,
        refreshToken: nextRefreshToken,
        user,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Session refresh failed. Please sign in again."),
    };
  }
}
