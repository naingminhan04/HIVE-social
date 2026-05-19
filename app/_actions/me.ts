"use server";

import axios from "axios";
import { ActionResponse } from "@/types/action";
import { LoginSuccessResponse } from "@/types/auth";
import { API_BASE_URL } from "@/libs/apiBase";
import { getApiErrorMessage } from "@/utils/apiError";
import { getAuthToken, getRefreshToken } from "./cookies";
import { applyAuthSessionFromPayload, toLoginSuccessResponse } from "./authSession";
import { refreshAction } from "./refresh";

export async function getCurrentUserAction(): Promise<ActionResponse<LoginSuccessResponse>> {
  const fetchMe = async (accessToken: string) => {
    const { data } = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data;
  };

  try {
    let accessToken = await getAuthToken();

    if (!accessToken) {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        return {
          success: false,
          error: "No active session. Please sign in again.",
        };
      }

      const refreshResult = await refreshAction();
      if (!refreshResult.success) {
        return refreshResult;
      }

      return refreshResult;
    }

    try {
      const data = await fetchMe(accessToken);
      const session = await applyAuthSessionFromPayload(data);
      const response = toLoginSuccessResponse(session);

      if (!response) {
        return {
          success: false,
          error: "Could not load your account.",
        };
      }

      return { success: true, data: response };
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 401) {
        return {
          success: false,
          error: getApiErrorMessage(error, "Could not load your account."),
        };
      }

      const refreshResult = await refreshAction();
      if (!refreshResult.success) {
        return refreshResult;
      }

      accessToken = refreshResult.data.accessToken ?? (await getAuthToken());
      if (!accessToken) {
        return refreshResult;
      }

      const data = await fetchMe(accessToken);
      const session = await applyAuthSessionFromPayload(data);
      const response = toLoginSuccessResponse(session);

      if (!response) {
        return refreshResult;
      }

      return { success: true, data: response };
    }
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Could not load your account."),
    };
  }
}
